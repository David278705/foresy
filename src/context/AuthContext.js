import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";

const AuthContext = createContext({});
const INTRO_SEEN_PREFIX = "@foresy_intro_seen_";

const getIntroSeenKey = (uid) => `${INTRO_SEEN_PREFIX}${uid}`;

const getAuthErrorMessage = (error) => {
  const code = error?.code || "";

  if (code === "auth/invalid-credential") {
    return "Credenciales inválidas. Verifica tus datos e inténtalo de nuevo.";
  }

  if (code === "auth/invalid-email") {
    return "El correo no es válido.";
  }

  if (code === "auth/user-not-found") {
    return "No existe una cuenta con este correo.";
  }

  if (code === "auth/wrong-password") {
    return "La contraseña es incorrecta.";
  }

  if (code === "auth/email-already-in-use") {
    return "Este correo ya está registrado.";
  }

  if (code === "auth/weak-password") {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (code === "auth/network-request-failed") {
    return "No hay conexión. Revisa internet e inténtalo de nuevo.";
  }

  return error?.message || "Ocurrió un error de autenticación.";
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [financialProfile, setFinancialProfile] = useState(null);
  const [needsFinancialOnboarding, setNeedsFinancialOnboarding] =
    useState(false);

  const loadFinancialProfile = async (uid) => {
    try {
      const profileRef = doc(db, "financialProfiles", uid);
      const snapshot = await getDoc(profileRef);

      if (!snapshot.exists()) {
        setFinancialProfile(null);
        setNeedsFinancialOnboarding(true);
        return;
      }

      const data = snapshot.data();
      const isCompleted = Boolean(data?.completed);

      if (!isCompleted) {
        setFinancialProfile(data || null);
        setNeedsFinancialOnboarding(true);
        return;
      }

      setFinancialProfile(data);
      setNeedsFinancialOnboarding(false);
    } catch (error) {
      setFinancialProfile(null);
      setNeedsFinancialOnboarding(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user?.uid) {
        try {
          const introSeenKey = getIntroSeenKey(user.uid);
          const introSeen = await AsyncStorage.getItem(introSeenKey);
          if (introSeen === "true") {
            setShowIntro(false);
          } else {
            const creationTime = user?.metadata?.creationTime;
            const lastSignInTime = user?.metadata?.lastSignInTime;
            const isFirstSignIn = Boolean(
              creationTime && lastSignInTime && creationTime === lastSignInTime,
            );

            if (isFirstSignIn) {
              setShowIntro(true);
            } else {
              await AsyncStorage.setItem(introSeenKey, "true");
              setShowIntro(false);
            }
          }
        } catch (error) {
          setShowIntro(true);
        }

        await loadFinancialProfile(user.uid);
      } else {
        setShowIntro(false);
        setFinancialProfile(null);
        setNeedsFinancialOnboarding(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (result?.user?.uid) {
        await AsyncStorage.removeItem(getIntroSeenKey(result.user.uid));
      }
      setShowIntro(true);
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signInWithGoogle = async (idToken) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      return await signInWithCredential(auth, credential);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signInWithApple = async ({ idToken, rawNonce }) => {
    try {
      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({ idToken, rawNonce });
      return await signInWithCredential(auth, credential);
    } catch (error) {
      if (error?.code === "auth/invalid-credential") {
        throw new Error(
          "Apple devolvió credenciales inválidas. Verifica en Firebase Authentication > Apple (Service ID, Team ID, Key ID y private key), que el Bundle ID sea com.foresy.app y que estés probando en build iOS con Sign in with Apple habilitado.",
        );
      }
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const logout = async () => {
    try {
      setShowIntro(false);
      setFinancialProfile(null);
      setNeedsFinancialOnboarding(false);
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const refreshFinancialProfile = async () => {
    if (!user?.uid) return;
    await loadFinancialProfile(user.uid);
  };

  const markIntroSeen = async () => {
    if (!user?.uid) {
      setShowIntro(false);
      return;
    }

    try {
      await AsyncStorage.setItem(getIntroSeenKey(user.uid), "true");
    } catch (error) {}
    setShowIntro(false);
  };

  const replayIntro = () => {
    setShowIntro(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        showIntro,
        financialProfile,
        needsFinancialOnboarding,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        logout,
        markIntroSeen,
        replayIntro,
        refreshFinancialProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
