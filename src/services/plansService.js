import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const PLANS_COLLECTION = "userPlans";

/* ════════════════ TIPOS DE PLAN ════════════════
 *
 *  "reminder"   → Pago recurrente / fecha puntual
 *  "checklist"  → Meta de ahorro con pasos (check/no-check)
 *  "session"    → Hablar periódicamente con Milo
 *
 * ════════════════════════════════════════════════ */

// ─── helpers de fecha ───────────────────────────
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const addDaysToDate = (dateStr, days) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const diffDays = (a, b) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 86400000);
};

/**
 * Genera las próximas N ocurrencias de un recordatorio periódico
 * a partir de startDate (o today si ya pasó).
 */
const generateReminderOccurrences = (plan, maxCount = 60) => {
  const { startDate, frequency, endDate } = plan;
  const todayStr = today();
  const base = startDate < todayStr ? todayStr : startDate;
  const results = [];
  let cursor = base;

  for (let i = 0; i < maxCount; i++) {
    if (endDate && cursor > endDate) break;
    results.push(cursor);

    if (frequency === "daily") cursor = addDaysToDate(cursor, 1);
    else if (frequency === "weekly") cursor = addDaysToDate(cursor, 7);
    else if (frequency === "biweekly") cursor = addDaysToDate(cursor, 14);
    else if (frequency === "monthly") {
      const d = new Date(cursor + "T12:00:00");
      d.setMonth(d.getMonth() + 1);
      cursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else if (frequency === "yearly") {
      const d = new Date(cursor + "T12:00:00");
      d.setFullYear(d.getFullYear() + 1);
      cursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else if (frequency === "once") {
      break; // solo 1 ocurrencia
    } else {
      cursor = addDaysToDate(cursor, 30); // fallback mensual
    }
  }
  return results;
};

/**
 * Genera las fechas de los pasos de un checklist.
 */
const generateChecklistDates = (steps = []) => {
  return steps.map((s) => s.date);
};

/**
 * Genera las próximas ocurrencias de sesiones con milo.
 */
const generateSessionOccurrences = (plan, maxCount = 30) => {
  const { frequency, startDate } = plan;
  const todayStr = today();
  const base = startDate && startDate >= todayStr ? startDate : todayStr;
  const results = [];
  let cursor = base;

  for (let i = 0; i < maxCount; i++) {
    results.push(cursor);
    if (frequency === "daily") cursor = addDaysToDate(cursor, 1);
    else if (frequency === "weekly") cursor = addDaysToDate(cursor, 7);
    else if (frequency === "biweekly") cursor = addDaysToDate(cursor, 14);
    else if (frequency === "monthly") {
      const d = new Date(cursor + "T12:00:00");
      d.setMonth(d.getMonth() + 1);
      cursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else {
      cursor = addDaysToDate(cursor, 7); // fallback semanal
    }
  }
  return results;
};

// ─── CRUD ───────────────────────────────────────

export const createPlan = async (uid, planData) => {
  const ref = collection(db, PLANS_COLLECTION);
  const docRef = await addDoc(ref, {
    userId: uid,
    ...planData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const deletePlan = async (planId) => {
  await deleteDoc(doc(db, PLANS_COLLECTION, planId));
};

/**
 * Update any fields of an existing plan.
 * planUpdates can include: title, description, amount, startDate, endDate,
 * frequency, steps, or any other plan field.
 */
export const updatePlan = async (planId, planUpdates) => {
  const sanitized = { ...planUpdates };
  // Remove fields that shouldn't be overwritten
  delete sanitized.id;
  delete sanitized.userId;
  delete sanitized.createdAt;

  await updateDoc(doc(db, PLANS_COLLECTION, planId), {
    ...sanitized,
    updatedAt: serverTimestamp(),
  });
};

export const toggleChecklistStep = async (planId, stepIndex, currentSteps) => {
  const updatedSteps = currentSteps.map((step, i) =>
    i === stepIndex ? { ...step, done: !step.done } : step,
  );
  await updateDoc(doc(db, PLANS_COLLECTION, planId), {
    steps: updatedSteps,
    updatedAt: serverTimestamp(),
  });
};

export const updatePlanFrequency = async (planId, newFrequency) => {
  await updateDoc(doc(db, PLANS_COLLECTION, planId), {
    frequency: newFrequency,
    updatedAt: serverTimestamp(),
  });
};

// ─── Real-time listener ─────────────────────────

export const subscribeToPlans = (uid, callback) => {
  // Solo filtramos por userId (no requiere índice compuesto).
  // El ordenamiento se hace en el cliente.
  const q = query(
    collection(db, PLANS_COLLECTION),
    where("userId", "==", uid),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const plans = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => {
          const ta = a.createdAt?.seconds ?? 0;
          const tb = b.createdAt?.seconds ?? 0;
          return tb - ta; // desc
        });
      callback(plans);
    },
    (error) => {
      console.warn("Plans subscription error:", error);
      callback([]);
    },
  );
};

// ─── Construir eventos para el calendario ───────

export const buildCalendarEvents = (plans, maxEvents = 10) => {
  const todayStr = today();
  const events = [];

  for (const plan of plans) {
    if (plan.type === "reminder") {
      const dates = generateReminderOccurrences(plan, 60);
      for (const date of dates) {
        if (date < todayStr) continue;
        events.push({
          planId: plan.id,
          type: "reminder",
          date,
          title: plan.title,
          description: plan.description,
          amount: plan.amount || null,
          frequency: plan.frequency,
          icon: "notifications",
          colors: ["#EF4444", "#F87171"],
        });
      }
    }

    if (plan.type === "checklist") {
      const steps = plan.steps || [];
      for (const step of steps) {
        if (step.date < todayStr) continue;
        events.push({
          planId: plan.id,
          stepIndex: steps.indexOf(step),
          type: "checklist",
          date: step.date,
          title: plan.title,
          description: step.label,
          done: Boolean(step.done),
          totalSteps: steps.length,
          completedSteps: steps.filter((s) => s.done).length,
          icon: "checkbox",
          colors: step.done ? ["#10B981", "#34D399"] : ["#F59E0B", "#FBBF24"],
        });
      }
    }

    if (plan.type === "session") {
      const dates = generateSessionOccurrences(plan, 30);
      for (const date of dates) {
        if (date < todayStr) continue;
        events.push({
          planId: plan.id,
          type: "session",
          date,
          title: "Hablar con milo",
          description: plan.description || "Cuéntale a milo cómo te fue con tu plata",
          frequency: plan.frequency,
          icon: "chatbubble-ellipses",
          colors: ["#8B5CF6", "#A78BFA"],
        });
      }
    }
  }

  // Ordenar por fecha y recortar a los próximos N eventos
  events.sort((a, b) => a.date.localeCompare(b.date));

  return events.slice(0, maxEvents);
};

export { today, addDaysToDate, diffDays };
