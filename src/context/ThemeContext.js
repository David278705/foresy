import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTheme } from "../constants/theme";

const THEME_MODE_KEY = "@foresy_theme_mode";

const ThemeContext = createContext({
  mode: "light",
  theme: getTheme("light"),
  setMode: () => {},
  toggleMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState("light");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (storedMode === "light" || storedMode === "dark") {
          setModeState(storedMode);
        }
      } catch (error) {}
    };

    loadTheme();
  }, []);

  const setMode = async (nextMode) => {
    const validMode = nextMode === "dark" ? "dark" : "light";
    setModeState(validMode);
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, validMode);
    } catch (error) {}
  };

  const toggleMode = async () => {
    await setMode(mode === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({
      mode,
      theme: getTheme(mode),
      setMode,
      toggleMode,
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
