import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const ActionCard = ({ title, description, buttonLabel, onPress, delay }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, opacity, translateY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View style={[styles.card, cardAnimatedStyle]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
      <AnimatedTouchableOpacity
        style={[styles.button, buttonAnimatedStyle]}
        onPress={onPress}
        onPressIn={() => {
          buttonScale.value = withSpring(0.97, { damping: 16, stiffness: 240 });
        }}
        onPressOut={() => {
          buttonScale.value = withSpring(1, { damping: 16, stiffness: 240 });
        }}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateY = useSharedValue(16);
  const logoutScale = useSharedValue(1);

  useEffect(() => {
    welcomeOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    welcomeTranslateY.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [welcomeOpacity, welcomeTranslateY]);

  const welcomeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [{ translateY: welcomeTranslateY.value }],
  }));

  const logoutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoutScale.value }],
  }));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌲 Foresy</Text>
        <Text style={styles.subtitle}>Simula tu vida antes de vivirla</Text>
      </View>

      <View style={styles.content}>
        <Animated.Text style={[styles.welcome, welcomeAnimatedStyle]}>
          Bienvenido, {user?.email || 'Usuario'}
        </Animated.Text>

        <ActionCard
          title="Tu Estado Base"
          description="Configura tu modelo de vida: ingresos, gastos, metas"
          buttonLabel="Configurar"
          onPress={() => navigation.navigate('EstadoBase')}
          delay={100}
        />

        <ActionCard
          title="Simulaciones"
          description="¿Qué pasa si...? Simula decisiones antes de tomarlas"
          buttonLabel="Simular"
          onPress={() => navigation.navigate('Simulaciones')}
          delay={180}
        />

        <ActionCard
          title="Comparador"
          description="Compara opciones A vs B vs C"
          buttonLabel="Comparar"
          onPress={() => navigation.navigate('Comparador')}
          delay={260}
        />

        <AnimatedTouchableOpacity
          style={[styles.button, styles.logoutButton, logoutAnimatedStyle]}
          onPress={logout}
          onPressIn={() => {
            logoutScale.value = withSpring(0.97, { damping: 16, stiffness: 240 });
          }}
          onPressOut={() => {
            logoutScale.value = withSpring(1, { damping: 16, stiffness: 240 });
          }}
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </AnimatedTouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 40,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#B7E4C7',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1B4332',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B4332',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#52796F',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#40916C',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#D8F3DC',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#1B4332',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
