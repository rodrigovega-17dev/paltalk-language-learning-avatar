import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextStyle } from 'react-native';
import { AndroidText } from './AndroidText';

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
  mode?: 'native' | 'target';
  excludedLanguages?: string[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageSelect,
  disabled = false,
  mode = 'target',
  excludedLanguages = [],
}) => {
  // Dynamic title based on mode
  const getTitle = () => {
    switch (mode) {
      case 'native':
        return 'Idioma Nativo';
      case 'target':
        return 'Idioma Objetivo';
      default:
        return 'Idioma Objetivo';
    }
  };

  // Filter out excluded languages
  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    language => !excludedLanguages.includes(language.code)
  );

  return (
    <View style={styles.container}>
      <AndroidText style={styles.label}>{getTitle()}</AndroidText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {availableLanguages.map((language) => (
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
            <AndroidText style={styles.flag}>{language.flag}</AndroidText>
            <AndroidText
              style={[
                styles.languageName,
                selectedLanguage === language.code && styles.selectedText,
                disabled && styles.disabledText,
              ].filter(Boolean) as TextStyle[]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              {language.name}
            </AndroidText>
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
    paddingHorizontal: 20,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    minWidth: 100,
    maxWidth: 120,
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
    lineHeight: 18,
    includeFontPadding: false,
    numberOfLines: 1,
    flexShrink: 1,
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
});