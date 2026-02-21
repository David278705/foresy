import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const ACHIEVEMENTS_COLLECTION = "userAchievements";

/* ════════════════════════════════════════════════
 *  TIPOS DE LOGRO
 *
 *  "plan_completed"      → Completó todos los pasos de un checklist
 *  "reminder_created"    → Estableció un recordatorio de pago
 *  "checklist_created"   → Creó un plan de ahorro / meta
 *  "session_created"     → Programó sesiones periódicas con milo
 *  "personal_milestone"  → Logro personal contado a milo
 *  "streak"              → Racha de actividad
 *
 * ════════════════════════════════════════════════ */

const ACHIEVEMENT_CONFIG = {
  plan_completed: {
    emoji: "🏆",
    label: "Meta cumplida",
    color: "#F59E0B",
  },
  reminder_created: {
    emoji: "🔔",
    label: "Recordatorio activo",
    color: "#EF4444",
  },
  checklist_created: {
    emoji: "📋",
    label: "Plan creado",
    color: "#3B82F6",
  },
  session_created: {
    emoji: "🗓️",
    label: "Sesión programada",
    color: "#8B5CF6",
  },
  personal_milestone: {
    emoji: "⭐",
    label: "Logro personal",
    color: "#10B981",
  },
  streak: {
    emoji: "🔥",
    label: "Racha activa",
    color: "#F97316",
  },
};

// ─── Add an achievement ─────────────────────────

export const addAchievement = async (uid, achievement) => {
  if (!uid) return;

  try {
    const docRef = doc(db, ACHIEVEMENTS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    const existing = snap.exists() ? snap.data() : {};
    const currentList = Array.isArray(existing.achievements)
      ? existing.achievements
      : [];

    // Prevent exact duplicates (same type + same title)
    const isDuplicate = currentList.some(
      (a) => a.type === achievement.type && a.title === achievement.title,
    );
    if (isDuplicate) return;

    const newAchievement = {
      ...achievement,
      date: new Date().toISOString(),
    };

    const updatedList = [newAchievement, ...currentList].slice(0, 50); // Keep max 50

    await setDoc(
      docRef,
      {
        achievements: updatedList,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("Error adding achievement:", err);
  }
};

// ─── Subscribe to achievements (real-time) ──────

export const subscribeToAchievements = (uid, callback) => {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const docRef = doc(db, ACHIEVEMENTS_COLLECTION, uid);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback(Array.isArray(data.achievements) ? data.achievements : []);
      } else {
        callback([]);
      }
    },
    () => callback([]),
  );
};

// ─── Get top achievements for display ───────────

export const getTopAchievements = (achievements, max = 3) => {
  if (!achievements || achievements.length === 0) return [];

  // Priority: plan_completed > personal_milestone > checklist_created > reminder_created > session_created
  const priority = {
    plan_completed: 5,
    personal_milestone: 4,
    checklist_created: 3,
    reminder_created: 2,
    session_created: 1,
    streak: 0,
  };

  return [...achievements]
    .sort((a, b) => {
      const pa = priority[a.type] ?? 0;
      const pb = priority[b.type] ?? 0;
      if (pb !== pa) return pb - pa;
      // Same priority → most recent first
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, max);
};

// ─── Build financial chart data from profile + plans ───
// 100% local — NO AI calls, zero cost.

export const buildFinancialCharts = (financialProfile, plans = []) => {
  const charts = {};
  const profileData = financialProfile?.profileData || {};

  // ── 1. Income vs Expenses donut / breakdown ──
  const incomeText = profileData.incomeContext || "";
  const expenseText = profileData.expenseContext || "";
  const debtText = profileData.debtContext || "";
  const savingsText = profileData.savingsAndInvestments || "";

  const income = extractFirstNumber(incomeText);
  const expenses = extractFirstNumber(expenseText);
  const debt = extractFirstNumber(debtText);
  const savings = extractFirstNumber(savingsText);

  if (income > 0) {
    const usedExpenses = expenses || 0;
    const usedDebt = debt || 0;
    const usedSavings = savings || 0;
    const remaining = Math.max(
      0,
      income - usedExpenses - usedDebt - usedSavings,
    );

    const segments = [];
    if (usedExpenses > 0)
      segments.push({ label: "Gastos", value: usedExpenses, color: "#EF4444" });
    if (usedDebt > 0)
      segments.push({ label: "Deudas", value: usedDebt, color: "#F59E0B" });
    if (usedSavings > 0)
      segments.push({
        label: "Ahorro",
        value: usedSavings,
        color: "#10B981",
      });
    if (remaining > 0)
      segments.push({
        label: "Libre",
        value: remaining,
        color: "#3B82F6",
      });

    if (segments.length >= 2) {
      charts.distribution = {
        title: "Tu dinero",
        income,
        segments,
      };
    }
  }

  // ── 2. Plan progress bars ──
  const checklistPlans = plans.filter(
    (p) => p.type === "checklist" && p.steps && p.steps.length > 0,
  );

  if (checklistPlans.length > 0) {
    charts.planProgress = {
      title: "Progreso de metas",
      plans: checklistPlans.map((p) => {
        const total = p.steps.length;
        const done = p.steps.filter((s) => s.done).length;
        return {
          id: p.id,
          title: p.title,
          total,
          done,
          percent: Math.round((done / total) * 100),
        };
      }),
    };
  }

  // ── 3. Active reminders summary ──
  const reminders = plans.filter((p) => p.type === "reminder");
  if (reminders.length > 0) {
    const totalMonthly = reminders.reduce((sum, r) => {
      const amount = r.amount || 0;
      if (r.frequency === "monthly") return sum + amount;
      if (r.frequency === "biweekly") return sum + amount * 2;
      if (r.frequency === "weekly") return sum + amount * 4.33;
      if (r.frequency === "daily") return sum + amount * 30;
      if (r.frequency === "yearly") return sum + amount / 12;
      if (r.frequency === "once") return sum; // don't count
      return sum + amount;
    }, 0);

    if (totalMonthly > 0) {
      charts.reminders = {
        title: "Pagos mensuales",
        totalMonthly: Math.round(totalMonthly),
        count: reminders.length,
        items: reminders
          .filter((r) => r.amount)
          .map((r) => ({
            title: r.title,
            amount: r.amount,
            frequency: r.frequency,
          }))
          .slice(0, 5),
      };
    }
  }

  // ── 4. Savings rate (if we can calculate it) ──
  if (income > 0 && savings > 0) {
    const rate = Math.round((savings / income) * 100);
    charts.savingsRate = {
      title: "Tasa de ahorro",
      rate,
      income,
      savings,
    };
  }

  return charts;
};

// ─── Helper: extract the first number from a text ───

const extractFirstNumber = (text) => {
  if (!text) return 0;
  // Match numbers with optional thousands separators (dots or commas) and optional decimals
  const match = text.match(
    /\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|[\d]+(?:[.,]\d{1,2})?)/,
  );
  if (!match) return 0;
  // Normalize: remove $ and spaces, handle separators
  let numStr = match[1].replace(/\s/g, "");
  // If has both dots and commas, figure out which is thousands separator
  const hasDots = (numStr.match(/\./g) || []).length;
  const hasCommas = (numStr.match(/,/g) || []).length;

  if (hasDots > 0 && hasCommas > 0) {
    // e.g., 1.200.000,50 or 1,200,000.50
    const lastDot = numStr.lastIndexOf(".");
    const lastComma = numStr.lastIndexOf(",");
    if (lastComma > lastDot) {
      // 1.200.000,50 format → dots are thousands, comma is decimal
      numStr = numStr.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,200,000.50 format → commas are thousands, dot is decimal
      numStr = numStr.replace(/,/g, "");
    }
  } else if (hasCommas === 1 && hasDots === 0) {
    // Could be decimal (3,50) or thousands (3,000)
    const afterComma = numStr.split(",")[1];
    if (afterComma && afterComma.length === 3) {
      numStr = numStr.replace(",", ""); // thousands
    } else {
      numStr = numStr.replace(",", "."); // decimal
    }
  } else if (hasDots === 1 && hasCommas === 0) {
    // Could be decimal (3.50) or thousands (3.000)
    const afterDot = numStr.split(".")[1];
    if (afterDot && afterDot.length === 3) {
      numStr = numStr.replace(".", ""); // thousands (e.g. 3.000 = 3000)
    }
    // else keep as is (decimal)
  } else {
    // Multiple dots or multiple commas → thousands separators
    numStr = numStr.replace(/[.,]/g, "");
  }

  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? 0 : parsed;
};

export { ACHIEVEMENT_CONFIG };
