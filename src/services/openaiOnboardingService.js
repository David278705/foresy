import Constants from "expo-constants";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

const SYSTEM_PROMPT = `Eres un asesor de onboarding financiero para una app llamada Foresy.
Tu objetivo es recolectar contexto financiero de forma profunda pero amable para personalizar toda la experiencia del usuario.

REGLAS:
1) Siempre responde SOLO en JSON válido.
2) Haz UNA sola pregunta por turno, clara y concreta.
3) Evalúa si ya tienes suficiente información para un perfil robusto.
4) Cuando falte información crítica, pregunta lo mínimo necesario con la mayor utilidad.
5) Cuando ya sea suficiente, marca isProfileComplete=true.
6) El onboarding tiene un máximo de 7 preguntas respondidas. Debes priorizar capturar la mayor calidad posible dentro de ese límite.

INFORMACIÓN OBJETIVO A CAPTURAR:
- Perfil personal básico (edad aproximada, ciudad/país, etapa de vida)
- Situación laboral e ingresos (tipo de ingreso, estabilidad, variabilidad)
- Estructura de gastos (fijos, variables, deudas, compromisos)
- Flujo de caja (capacidad de ahorro mensual estimada)
- Deudas y obligaciones (monto, tasa, prioridad)
- Ahorro e inversión (hábitos, instrumentos, horizonte, riesgo)
- Metas financieras (corto, medio, largo plazo)
- Riesgos y preocupaciones (imprevistos, ansiedad financiera)
- Preferencias de acompañamiento (estilo de recomendaciones, frecuencia)

JSON de salida obligatorio:
{
  "nextQuestion": "string",
  "isProfileComplete": boolean,
  "profileSummary": "string",
  "profileData": {
    "personalContext": "string",
    "incomeContext": "string",
    "expenseContext": "string",
    "debtContext": "string",
    "savingsAndInvestments": "string",
    "goals": "string",
    "riskAndConcerns": "string",
    "decisionStyle": "string"
  },
  "capturedFacts": ["string"],
  "completionReason": "string"
}

Si no hay suficiente contexto, isProfileComplete debe ser false.
Si ya hay contexto suficiente para responder prácticamente cualquier duda financiera del usuario en la app, isProfileComplete debe ser true.
`;

const getOpenAIConfig = () => {
  const openaiConfig = Constants.expoConfig?.extra?.openai || {};

  return {
    apiKey: openaiConfig.apiKey || "",
    model: openaiConfig.model || DEFAULT_MODEL,
    transcriptionModel:
      openaiConfig.transcriptionModel || DEFAULT_TRANSCRIPTION_MODEL,
  };
};

const extractJson = (text) => {
  if (!text) {
    throw new Error("La IA no devolvió contenido.");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start >= 0 && end > start) {
      const jsonSlice = text.slice(start, end + 1);
      return JSON.parse(jsonSlice);
    }

    throw new Error("No se pudo interpretar la respuesta de la IA.");
  }
};

export const transcribeAudioWithOpenAI = async (audioUri) => {
  const { apiKey, transcriptionModel } = getOpenAIConfig();

  if (!apiKey) {
    throw new Error(
      "Falta la API key de OpenAI. Configúrala en app.json > expo.extra.openai.apiKey.",
    );
  }

  const formData = new FormData();
  formData.append("file", {
    uri: audioUri,
    type: "audio/m4a",
    name: "recording.m4a",
  });
  formData.append("model", transcriptionModel);
  formData.append("language", "es");

  const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error transcribiendo audio: ${errorBody}`);
  }

  const data = await response.json();
  return data?.text || "";
};

export const getFinancialOnboardingStep = async ({
  history,
  latestAnswer,
  maxQuestions = 7,
  forceComplete = false,
}) => {
  const { apiKey, model } = getOpenAIConfig();

  if (!apiKey) {
    throw new Error(
      "Falta la API key de OpenAI. Configúrala en app.json > expo.extra.openai.apiKey.",
    );
  }

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
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify({
            history,
            latestAnswer,
            maxQuestions,
            currentQuestionCount: Array.isArray(history) ? history.length : 0,
            instruction:
              forceComplete
                ? "Debes cerrar el perfil ahora mismo. Responde con isProfileComplete=true, entrega profileSummary y profileData completos y no dejes preguntas pendientes."
                : "Evalúa el contexto acumulado y devuelve la siguiente pregunta o finalización.",
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error consultando OpenAI: ${errorBody}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);

  return {
    nextQuestion:
      parsed?.nextQuestion ||
      "¿Puedes contarme un poco más de tu situación financiera actual?",
    isProfileComplete: Boolean(parsed?.isProfileComplete),
    profileSummary: parsed?.profileSummary || "",
    profileData: parsed?.profileData || {},
    capturedFacts: Array.isArray(parsed?.capturedFacts)
      ? parsed.capturedFacts
      : [],
    completionReason: parsed?.completionReason || "",
  };
};
