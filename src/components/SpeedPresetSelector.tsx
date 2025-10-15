import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, TextStyle } from 'react-native';
import { AndroidText } from './AndroidText';
import Toast from 'react-native-toast-message';

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
      Toast.show({
        type: 'error',
        text1: 'No se pudo reproducir',
        text2: 'Intenta nuevamente en unos segundos.',
      });
    } finally {
      setTesting(null);
    }
  };

  return (
    <View style={styles.container}>
      <AndroidText style={styles.label}>Velocidad del Habla</AndroidText>
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
                <AndroidText
                  style={[
                    styles.presetLabel,
                    isSelected && styles.selectedLabel,
                    disabled && styles.disabledText,
                  ].filter(Boolean) as TextStyle[]}
                >
                  {preset.label}
                </AndroidText>
                <AndroidText
                  style={[
                    styles.presetDescription,
                    isSelected && styles.selectedDescription,
                    disabled && styles.disabledText,
                  ].filter(Boolean) as TextStyle[]}
                >
                  {preset.description}
                </AndroidText>
                <AndroidText
                  style={[
                    styles.presetValue,
                    isSelected && styles.selectedValue,
                    disabled && styles.disabledText,
                  ].filter(Boolean) as TextStyle[]}
                >
                  {preset.value}x
                </AndroidText>
              </TouchableOpacity>

              {onTestSpeed && (
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    isTesting && styles.testButtonTesting,
                    disabled && styles.testButtonDisabled,
                  ]}
                  onPress={() => handleTestSpeed(preset.value)}
                  disabled={disabled || isTesting}
                >
                  <AndroidText style={styles.testButtonText}>🎵</AndroidText>
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
    minHeight: 110,
    justifyContent: 'space-between',
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
    marginBottom: 6,
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
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  testButtonTesting: {
    backgroundColor: '#2563EB',
    shadowOpacity: 0.1,
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
});