import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../services/firebaseConfig";

const AuthContext = createContext({});
const INTRO_SEEN_PREFIX = "@foresy_intro_seen_";

const getIntroSeenKey = (uid) => `${INTRO_SEEN_PREFIX}${uid}`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);

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
      } else {
        setShowIntro(false);
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
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      setShowIntro(false);
      await signOut(auth);
    } catch (error) {
      throw error;
    }
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
        signUp,
        signIn,
        logout,
        markIntroSeen,
        replayIntro,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
