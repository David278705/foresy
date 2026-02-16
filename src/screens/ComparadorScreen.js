import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const ComparadorScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Comparador</Text>
        <Text style={styles.subtitle}>
          Compara opciones A vs B vs C
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>⚖️ Comparaciones Típicas</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            • Trabajo actual vs nueva oferta
          </Text>
          <Text style={styles.cardText}>
            • Arriendo opción 1 vs opción 2
          </Text>
          <Text style={styles.cardText}>
            • Comprar vs alquilar
          </Text>
          <Text style={styles.cardText}>
            • Carro propio vs transporte público
          </Text>
        </View>

        <Text style={styles.sectionTitle}>📊 Análisis Comparativo</Text>
        <Text style={styles.placeholder}>
          Próximamente: Herramienta de comparación con métricas
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

export default ComparadorScreen;
