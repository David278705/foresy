import Constants from "expo-constants";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

const getOpenAIConfig = () => {
  const openaiConfig = Constants.expoConfig?.extra?.openai || {};
  return {
    apiKey: openaiConfig.apiKey || "",
    model: openaiConfig.model || DEFAULT_MODEL,
  };
};

const extractJson = (text) => {
  if (!text) throw new Error("La IA no devolvió contenido.");
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("No se pudo interpretar la respuesta de insights.");
  }
};

const INSIGHTS_PROMPT = `Eres un analista financiero que genera insights estructurados sobre la situación financiera de un usuario.

REGLAS:
1) Responde SOLO en JSON válido.
2) Sé breve y concreto. Nada de frases motivacionales ni genéricas.
3) Usa los datos reales del usuario — no inventes números.
4) Si no hay datos suficientes para una sección, pon un array vacío.

DEBES generar:

1. "summary" — Un resumen financiero estructurado en markdown. Formato:
   - Usa secciones con emojis como encabezado (no usar # de markdown).
   - Cada sección con 1-2 líneas máximo.
   - Secciones posibles: 💼 Ingreso, 💳 Gastos, 🏦 Deudas, 💰 Ahorro, 🎯 Metas.
   - Solo incluye secciones para las que hay datos.
   - Pon los números clave en **negritas**.
   - Máximo 8 líneas en total.

2. "strengths" — Array de cosas que el usuario está haciendo bien (máximo 3).
   Cada item: { "title": "string corto", "detail": "1 oración con dato concreto" }
   Solo incluir si hay evidencia real en los datos. Si no hay datos suficientes, array vacío.

3. "improvements" — Array de oportunidades de mejora (máximo 3).
   Cada item: { "title": "string corto", "detail": "1 oración con dato concreto y sugerencia accionable" }
   Solo incluir si hay evidencia real en los datos. Si no hay datos suficientes, array vacío.

Formato de salida:
{
  "summary": "string (markdown)",
  "strengths": [{ "title": "string", "detail": "string" }],
  "improvements": [{ "title": "string", "detail": "string" }]
}
`;

/**
 * Genera insights financieros estructurados a partir del perfil del usuario.
 * Se llama después del onboarding, al actualizar perfil, o al completar un plan.
 *
 * @param {object} params
 * @param {object} params.profileData — datos del perfil financiero
 * @param {string} params.profileSummary — resumen existente (del onboarding)
 * @param {Array}  params.capturedFacts — hechos capturados
 * @param {Array}  params.plans — planes activos del usuario
 * @returns {{ summary: string, strengths: Array, improvements: Array }}
 */
export const generateFinancialInsights = async ({
  profileData = {},
  profileSummary = "",
  capturedFacts = [],
  plans = [],
}) => {
  const { apiKey, model } = getOpenAIConfig();

  if (!apiKey) {
    throw new Error("Falta la API key de OpenAI.");
  }

  const compactPlans = plans.map((p) => ({
    type: p.type,
    title: p.title,
    frequency: p.frequency,
    ...(p.amount ? { amount: p.amount } : {}),
    ...(p.steps
      ? {
          totalSteps: p.steps.length,
          completedSteps: p.steps.filter((s) => s.done).length,
        }
      : {}),
  }));

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INSIGHTS_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            profileData,
            profileSummary,
            capturedFacts,
            activePlans: compactPlans,
            instruction:
              "Genera el resumen estructurado, fortalezas y oportunidades de mejora basándote SOLO en los datos reales disponibles.",
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error generando insights: ${errorBody}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);

  return {
    summary: parsed?.summary || "",
    strengths: Array.isArray(parsed?.strengths) ? parsed.strengths.slice(0, 3) : [],
    improvements: Array.isArray(parsed?.improvements) ? parsed.improvements.slice(0, 3) : [],
  };
};
