import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'english', name: 'Inglés', flag: '🇺🇸' },
  { code: 'spanish', name: 'Español', flag: '🇪🇸' },
  { code: 'french', name: 'Francés', flag: '🇫🇷' },
  { code: 'german', name: 'Alemán', flag: '🇩🇪' },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageSelect: (language: string) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageSelect,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Idioma Objetivo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <TouchableOpacity
            key={language.code}
            style={[
              styles.languageOption,
              selectedLanguage === language.code && styles.selectedOption,
              disabled && styles.disabledOption,
            ]}
            onPress={() => !disabled && onLanguageSelect(language.code)}
            disabled={disabled}
          >
            <Text style={styles.flag}>{language.flag}</Text>
            <Text
              style={[
                styles.languageName,
                selectedLanguage === language.code && styles.selectedText,
                disabled && styles.disabledText,
              ]}
            >
              {language.name}
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
  languageOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    minWidth: 80,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  disabledOption: {
    opacity: 0.5,
  },
  flag: {
    fontSize: 24,
    marginBottom: 4,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
});