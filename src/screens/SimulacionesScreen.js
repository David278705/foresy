import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const SimulacionesScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simulaciones</Text>
        <Text style={styles.subtitle}>
          ¿Qué pasa si...? Prueba decisiones antes de tomarlas
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>💡 Escenarios Populares</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            • ¿Qué pasa si cambio de trabajo?
          </Text>
          <Text style={styles.cardText}>
            • ¿Qué pasa si me mudo de ciudad?
          </Text>
          <Text style={styles.cardText}>
            • ¿Qué pasa si pido un crédito?
          </Text>
          <Text style={styles.cardText}>
            • ¿Qué pasa si reduzco gastos?
          </Text>
        </View>

        <Text style={styles.sectionTitle}>📈 Motor de Simulación</Text>
        <Text style={styles.placeholder}>
          Próximamente: Simulador interactivo con visualizaciones
        </Text>
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
    padding: 32,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#B7E4C7',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B4332',
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#1B4332',
    marginBottom: 12,
  },
  placeholder: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    color: '#52796F',
    fontSize: 14,
  },
});

export default SimulacionesScreen;
