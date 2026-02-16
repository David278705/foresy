import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 
 * 1. Ve a https://console.firebase.google.com/
 * 2. Crea un nuevo proyecto o selecciona uno existente
 * 3. En la configuración del proyecto, obtén tu configuración web
 * 4. Copia este archivo como 'firebaseConfig.js' (sin el .example)
 * 5. Reemplaza los valores de configuración a continuación con los tuyos
 * 6. Activa Authentication (Email/Password) en Firebase Console
 * 7. Activa Firestore Database en Firebase Console
 */

const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
