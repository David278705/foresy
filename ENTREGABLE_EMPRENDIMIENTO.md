# 🌲 Foresy — Entregable de Emprendimiento

---

## 1. Nombre de la idea

**Foresy** — _"Simula tu vida antes de vivirla"_

Foresy es una app móvil con un asistente financiero de inteligencia artificial llamado **Milo**, un oso perezoso que te acompaña a simular decisiones financieras antes de tomarlas. No es un chatbot genérico: Milo entiende tu contexto real, habla como una persona y piensa contigo, no por ti.

---

## 2. Tendencia identificada

### ¿Cuál es la tendencia?

**La asesoría financiera personal impulsada por Inteligencia Artificial conversacional.**

La combinación de IA generativa con finanzas personales está transformando cómo las personas gestionan su dinero. Modelos como GPT-4 permiten que cualquier persona reciba orientación financiera personalizada desde su celular, sin depender de un asesor humano costoso.

El mercado global de IA creció de USD 371 mil millones en 2025 y se proyecta a **USD 2.4 billones para 2032** (CAGR del 30.6% — MarketsandMarkets). El mercado de pagos y finanzas digitales alcanzó **USD 26.89 billones** en 2026, con 3.81 mil millones de usuarios proyectados para 2030 (Statista). Apps como Cleo, Albert y Monarch ya integran IA en sus productos y dominan los rankings de Forbes 2026.

### ¿Por qué es una tendencia y no una moda?

- **Cambio tecnológico irreversible**: La IA generativa mejora año tras año, es más accesible y más barata. No es un pico pasajero — es infraestructura que se consolida.
- **Cambio demográfico**: Millennials y Gen Z (18-35 años) resuelven todo desde el celular. Según el Banco Mundial, más de **1.400 millones de adultos** aún no acceden a servicios financieros formales, y en Latinoamérica la brecha es aún mayor.
- **Cambio cultural**: Desde la pandemia de 2020, el interés por educación financiera creció de forma sostenida. Los "finfluencers" explotan en redes sociales, pero falta una herramienta que convierta ese interés en acción personalizada.

Una moda dura meses. Esta tendencia lleva más de 5 años construyéndose y cada año gana más inversión, usuarios y adopción global.

### ¿Cómo está impactando el sector?

- Antes la asesoría financiera costaba entre $100 y $500 USD por sesión. Hoy, una app con IA ofrece orientación continua por menos de $5/mes.
- Apps como Cleo (UK) y Albert (US) ya validaron el modelo con millones de usuarios. Pero **en español y para Latinoamérica el mercado está prácticamente vacío**.
- Bancos como BBVA y Nubank ya integran chatbots financieros, confirmando que la IA conversacional es el estándar futuro de la relación con el cliente financiero.

---

## 3. Problema concreto

**Los jóvenes adultos en Latinoamérica toman decisiones financieras importantes a ciegas, sin herramientas para simular sus consecuencias.**

Un joven que decide si acepta un nuevo trabajo, pide un crédito, se muda de ciudad o compra un carro, no tiene forma fácil de responder: _"¿Qué pasa con mis finanzas si tomo esta decisión?"_

Las apps financieras existentes (YNAB, Monarch, Rocket Money) solo registran gastos pasados, están en inglés, están diseñadas para el mercado estadounidense y no ofrecen simulación de escenarios futuros. No hay ninguna que combine IA conversacional + simulación financiera + español + contexto latinoamericano.

**Consecuencia directa**: decisiones impulsivas, endeudamiento evitable y ansiedad financiera en un segmento que está empezando su vida económica.

---

## 4. Segmento específico

**Jóvenes adultos de 18 a 35 años en Latinoamérica**, específicamente:

- **Universitarios y recién graduados** que empiezan a generar sus primeros ingresos y no saben cómo administrarlos.
- **Jóvenes profesionales** enfrentando sus primeras decisiones financieras grandes: primer arriendo, crédito educativo, primer carro, cambio de trabajo.
- **Consumidores de contenido financiero en redes sociales** que se educan con finfluencers pero no tienen una herramienta práctica para aplicar ese conocimiento a **su** situación real.

Este segmento es nativo digital, resuelve todo desde el celular, prefiere interacciones conversacionales sobre formularios, y está dispuesto a pagar por claridad financiera. Pero hoy **no encuentra opciones en su idioma ni adaptadas a su realidad económica**.

---

## 5. Propuesta de solución viable

Foresy es una **app móvil** (iOS y Android) construida con React Native y potenciada por inteligencia artificial (GPT-4o-mini). Ofrece exactamente lo que el segmento necesita:

| Función                       | ¿Qué hace?                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🦥 Milo (Chat IA)**         | Asistente conversacional que entiende tu contexto financiero completo y te orienta como un amigo que sabe de plata. Habla con números reales de tu perfil, no con frases genéricas. Acepta texto y voz. |
| **📊 Onboarding inteligente** | Milo te hace ~7 preguntas (por voz o texto) para construir tu perfil financiero: ingresos, gastos, deudas, metas, estilo de vida y tolerancia al riesgo.                                                |
| **🔮 Simulaciones**           | Motor de escenarios "¿Qué pasa si...?": ¿Qué pasa si cambio de trabajo? ¿Si pido un crédito? ¿Si me mudo? Proyecta el impacto real en tus finanzas antes de actuar.                                     |
| **⚖️ Comparador**             | Compara alternativas lado a lado (trabajo A vs B, arriendo 1 vs 2, comprar vs alquilar) con métricas claras y un score de decisión.                                                                     |

### ¿Qué la hace diferente?

- **100% en español**, diseñada para el contexto económico latinoamericano.
- **Milo tiene personalidad real**: es un oso perezoso que habla como una persona en un café, no como un chatbot corporativo. Directo, honesto, con humor sutil.
- **Input por voz**: reduce fricción para quienes prefieren hablar en vez de escribir.
- **No solo mira el pasado: simula el futuro**. Esa es la propuesta de valor central.
- **La app ya está construida y funcional**: no es un concepto, es un producto real.

---

## 6. Modelo económico inicial

| Concepto                      | Detalle                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modelo de negocio**         | Freemium + Suscripción mensual                                                                                                                              |
| **Versión gratuita**          | Onboarding con Milo, perfil financiero básico, 3 consultas al chat por día, resumen de insights.                                                            |
| **Plan Pro**                  | **$4.99 USD/mes** (~$20.000 COP): Chat ilimitado con Milo, simulaciones avanzadas, comparador completo, alertas preventivas.                                |
| **Costos operativos**         | API de OpenAI: ~$0.15–$0.60/usuario/mes. Firebase: gratis hasta 50K lecturas/día. Infraestructura: ~$50 USD/mes inicial. **Total estimado: ~$800 USD/mes.** |
| **Meta año 1**                | 5,000 usuarios registrados, 500 suscriptores Pro.                                                                                                           |
| **Ingreso proyectado**        | 500 × $4.99 = **~$2,495 USD/mes**.                                                                                                                          |
| **Punto de equilibrio**       | **~200 suscriptores Pro** cubren todos los costos operativos.                                                                                               |
| **Estrategia de adquisición** | Contenido orgánico en TikTok e Instagram (marca propia como finfluencer), alianzas con universidades, programa de referidos dentro de la app.               |

### ¿Por qué es viable económicamente?

1. **Costos ultra bajos**: La IA funciona por API (pago por uso), Firebase ofrece capa gratuita generosa, y la app ya está desarrollada. No hay costos fijos altos.
2. **Precio accesible**: $4.99 USD/mes es competitivo para Latam y muy por debajo de los $10-$15 USD que cobran apps como Monarch o YNAB en EE.UU.
3. **Escalabilidad**: Cada nuevo usuario cuesta centavos de dólar en infraestructura. Escalar de 500 a 5,000 suscriptores no requiere cambios de arquitectura.
4. **Producto terminado**: La app ya está construida — no se necesita inversión adicional para lanzar un MVP.

---

_Presentación preparada para la materia de Emprendimiento — Febrero 2026_
