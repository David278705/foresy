import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const EstadoBaseScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tu Estado Base</Text>
        <Text style={styles.subtitle}>
          Configura tu modelo de vida financiera
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>📊 Ingresos</Text>
        <Text style={styles.placeholder}>
          Próximamente: Configuración de ingresos
        </Text>

        <Text style={styles.sectionTitle}>💰 Gastos Fijos</Text>
        <Text style={styles.placeholder}>
          Próximamente: Configuración de gastos fijos
        </Text>

        <Text style={styles.sectionTitle}>🛒 Gastos Variables</Text>
        <Text style={styles.placeholder}>
          Próximamente: Configuración de gastos variables
        </Text>

        <Text style={styles.sectionTitle}>🎯 Metas</Text>
        <Text style={styles.placeholder}>
          Próximamente: Configuración de metas financieras
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
  placeholder: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    color: '#52796F',
    fontSize: 14,
  },
});

export default EstadoBaseScreen;
