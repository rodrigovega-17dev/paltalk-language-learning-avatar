import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface SpeedPreset {
  value: number;
  label: string;
  description: string;
}

const SPEED_PRESETS: SpeedPreset[] = [
  { value: 0.7, label: 'Lento', description: 'Para principiantes' },
  { value: 1.0, label: 'Normal', description: 'Velocidad estándar' },
  { value: 1.3, label: 'Rápido', description: 'Para avanzados' },
];

interface SpeedPresetSelectorProps {
  selectedSpeed: number;
  onSpeedSelect: (speed: number) => void;
  disabled?: boolean;
  onTestSpeed?: (speed: number) => void;
}

export const SpeedPresetSelector: React.FC<SpeedPresetSelectorProps> = ({
  selectedSpeed,
  onSpeedSelect,
  disabled = false,
  onTestSpeed,
}) => {
  const [testing, setTesting] = useState<number | null>(null);
  const findClosestPreset = (speed: number): number => {
    return SPEED_PRESETS.reduce((closest, preset) => 
      Math.abs(preset.value - speed) < Math.abs(closest - speed) ? preset.value : closest
    , SPEED_PRESETS[0].value);
  };

  const closestSpeed = findClosestPreset(selectedSpeed);

  const handleTestSpeed = async (speed: number) => {
    if (!onTestSpeed) return;
    
    setTesting(speed);
    try {
      await onTestSpeed(speed);
    } catch (error) {
      Alert.alert('Prueba Fallida', 'No se pudo reproducir el audio de prueba.');
    } finally {
      setTesting(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Velocidad del Habla</Text>
      <View style={styles.presetsContainer}>
        {SPEED_PRESETS.map((preset) => {
          const isSelected = closestSpeed === preset.value;
          const isTesting = testing === preset.value;
          
          return (
            <View key={preset.value} style={styles.presetWrapper}>
              <TouchableOpacity
                style={[
                  styles.presetButton,
                  isSelected && styles.selectedPreset,
                  disabled && styles.disabledPreset,
                ]}
                onPress={() => !disabled && onSpeedSelect(preset.value)}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.presetLabel,
                    isSelected && styles.selectedLabel,
                    disabled && styles.disabledText,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text
                  style={[
                    styles.presetDescription,
                    isSelected && styles.selectedDescription,
                    disabled && styles.disabledText,
                  ]}
                >
                  {preset.description}
                </Text>
                <Text
                  style={[
                    styles.presetValue,
                    isSelected && styles.selectedValue,
                    disabled && styles.disabledText,
                  ]}
                >
                  {preset.value}x
                </Text>
              </TouchableOpacity>
              
              {onTestSpeed && (
                <TouchableOpacity
                  style={[styles.testButton, isTesting && styles.testButtonTesting]}
                  onPress={() => handleTestSpeed(preset.value)}
                  disabled={disabled || isTesting}
                >
                  <Text style={styles.testButtonText}>
                    {isTesting ? '...' : '🎵'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
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
  presetsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  presetButton: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  selectedPreset: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  disabledPreset: {
    opacity: 0.5,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedLabel: {
    color: '#007AFF',
  },
  presetDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedDescription: {
    color: '#374151',
  },
  presetValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  selectedValue: {
    color: '#007AFF',
  },
  disabledText: {
    color: '#999',
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    minWidth: 30,
    alignItems: 'center',
  },
  testButtonTesting: {
    backgroundColor: '#6B7280',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});