# 🌲 Foresy

**Simula tu vida antes de vivirla**

Una aplicación móvil que te permite simular decisiones financieras antes de tomarlas.

## 🚀 Características

- **Estado Base**: Configura tu modelo de vida (ingresos, gastos, metas)
- **Simulaciones**: Prueba escenarios "¿Qué pasa si...?"
- **Comparador**: Compara opciones A vs B vs C
- **Alertas Preventivas**: Recibe avisos antes de problemas financieros

## 📦 Tecnologías

- React Native con Expo
- Firebase (Authentication & Firestore)
- React Navigation
- React Native Chart Kit (para visualizaciones)

## ⚙️ Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Activa Authentication (Email/Password)
3. Activa Firestore Database
4. Copia tu configuración de Firebase
5. Actualiza `src/services/firebaseConfig.js` con tus credenciales:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 3. Ejecutar la aplicación

```bash
npm start
```

o

```bash
npx expo start
```

## 📱 Estructura del Proyecto

```
foresy/
├── src/
│   ├── screens/          # Pantallas de la app
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── HomeScreen.js
│   │   ├── EstadoBaseScreen.js
│   │   ├── SimulacionesScreen.js
│   │   └── ComparadorScreen.js
│   ├── components/       # Componentes reutilizables
│   ├── navigation/       # Configuración de navegación
│   ├── context/          # Context API (Auth, etc.)
│   ├── services/         # Servicios (Firebase, etc.)
│   ├── utils/            # Utilidades y helpers
│   └── constants/        # Constantes de la app
├── App.js
└── package.json
```

## 🎯 Roadmap

### MVP (Fase 1)
- [x] Autenticación con Firebase
- [x] Navegación básica
- [ ] Configuración de Estado Base
- [ ] Motor de simulación simple
- [ ] Visualizaciones básicas

### Fase 2
- [ ] Simulaciones avanzadas
- [ ] Comparador A/B/C
- [ ] Guardado de escenarios
- [ ] Alertas preventivas

### Fase 3
- [ ] Modelo Premium
- [ ] Simulaciones de largo plazo
- [ ] Modo pareja
- [ ] Modo emprendedor

## 📝 Notas

- La app usa Firebase para autenticación y base de datos
- Todas las simulaciones se procesan localmente
- Los datos son privados y encriptados

## 🤝 Contribuir

Este es un proyecto en desarrollo activo. Las contribuciones son bienvenidas.

## 📄 Licencia

MIT
