import React from "react";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Screens
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import EstadoBaseScreen from "../screens/EstadoBaseScreen";
import SimulacionesScreen from "../screens/SimulacionesScreen";
import ComparadorScreen from "../screens/ComparadorScreen";
import ProfileScreen from "../screens/ProfileScreen";
import IntroScreen from "../screens/IntroScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenIcon = {
  Inicio: "sparkles",
  EstadoBase: "bar-chart",
  Simulaciones: "pulse",
  Comparador: "git-compare",
  Perfil: "person-circle",
};

const MainTabs = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSpace = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBackground,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 56 + bottomSpace,
          paddingTop: 8,
          paddingBottom: bottomSpace,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={screenIcon[route.name] || "ellipse"}
            size={focused ? size + 2 : size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen
        name="EstadoBase"
        component={EstadoBaseScreen}
        options={{ title: "Estado Base" }}
      />
      <Tab.Screen name="Simulaciones" component={SimulacionesScreen} />
      <Tab.Screen name="Comparador" component={ComparadorScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { theme } = useTheme();
  const { user, loading, showIntro } = useAuth();

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.tabBackground,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  if (loading) {
    return null; // O un componente de loading
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: {
            backgroundColor: theme.colors.tabBackground,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: {
            fontWeight: "700",
          },
        }}
      >
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            {showIntro ? (
              <Stack.Screen
                name="Intro"
                component={IntroScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                  animation: "fade",
                }}
              />
            ) : (
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
