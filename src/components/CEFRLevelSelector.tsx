import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface CEFRLevelInfo {
  level: CEFRLevel;
  name: string;
  description: string;
}

export const CEFR_LEVELS: CEFRLevelInfo[] = [
  {
    level: 'A1',
    name: 'Principiante',
    description: 'Puede entender y usar expresiones cotidianas familiares',
  },
  {
    level: 'A2',
    name: 'Elemental',
    description: 'Puede comunicarse en tareas simples y rutinarias',
  },
  {
    level: 'B1',
    name: 'Intermedio',
    description: 'Puede lidiar con la mayoría de situaciones mientras viaja',
  },
  {
    level: 'B2',
    name: 'Intermedio Alto',
    description: 'Puede interactuar con hablantes nativos con fluidez',
  },
  {
    level: 'C1',
    name: 'Avanzado',
    description: 'Puede expresar ideas con fluidez y espontaneidad',
  },
  {
    level: 'C2',
    name: 'Competente',
    description: 'Puede entender prácticamente todo lo que escucha o lee',
  },
];

interface CEFRLevelSelectorProps {
  selectedLevel: CEFRLevel;
  onLevelSelect: (level: CEFRLevel) => void;
  disabled?: boolean;
}

export const CEFRLevelSelector: React.FC<CEFRLevelSelectorProps> = ({
  selectedLevel,
  onLevelSelect,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nivel de Competencia (MCER)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {CEFR_LEVELS.map((levelInfo) => (
          <TouchableOpacity
            key={levelInfo.level}
            style={[
              styles.levelOption,
              selectedLevel === levelInfo.level && styles.selectedOption,
              disabled && styles.disabledOption,
            ]}
            onPress={() => !disabled && onLevelSelect(levelInfo.level)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.levelCode,
                selectedLevel === levelInfo.level && styles.selectedLevelCode,
                disabled && styles.disabledText,
              ]}
            >
              {levelInfo.level}
            </Text>
            <Text
              style={[
                styles.levelName,
                selectedLevel === levelInfo.level && styles.selectedText,
                disabled && styles.disabledText,
              ]}
            >
              {levelInfo.name}
            </Text>
            <Text
              style={[
                styles.levelDescription,
                disabled && styles.disabledText,
              ]}
            >
              {levelInfo.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  scrollView: {
    flexGrow: 0,
  },
  levelOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    width: 200,
    minHeight: 120,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  disabledOption: {
    opacity: 0.5,
  },
  levelCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  selectedLevelCode: {
    color: '#007AFF',
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  selectedText: {
    color: '#007AFF',
  },
  levelDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  disabledText: {
    color: '#999',
  },
});