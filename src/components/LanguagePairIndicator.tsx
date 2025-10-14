import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AndroidText } from './AndroidText';

interface LanguagePairIndicatorProps {
  nativeLanguage?: string;
  targetLanguage?: string;
}

export const LanguagePairIndicator: React.FC<LanguagePairIndicatorProps> = ({
  nativeLanguage,
  targetLanguage,
}) => {
  // Helper function to get language display name
  const getLanguageDisplayName = (languageCode?: string): string => {
    if (!languageCode) return '';
    
    const languageNames: { [key: string]: string } = {
      'english': 'English',
      'spanish': 'Español',
      'french': 'Français',
      'german': 'Deutsch',
      'italian': 'Italiano',
      'portuguese': 'Português',
      'russian': 'Русский',
      'chinese': '中文',
      'japanese': '日本語',
      'korean': '한국어',
      'arabic': 'العربية',
    };
    
    return languageNames[languageCode] || languageCode;
  };

  const nativeDisplayName = getLanguageDisplayName(nativeLanguage);
  const targetDisplayName = getLanguageDisplayName(targetLanguage);

  // Don't render if both languages are not set
  if (!nativeLanguage || !targetLanguage) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.languagePair}>
        <AndroidText style={styles.languageText}>{nativeDisplayName}</AndroidText>
        <AndroidText style={styles.arrow}>→</AndroidText>
        <AndroidText style={styles.languageText}>{targetDisplayName}</AndroidText>
      </View>
      <AndroidText style={styles.description}>
        Aprendiendo {targetDisplayName} desde {nativeDisplayName}
      </AndroidText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginVertical: 8,
  },
  languagePair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 8,
  },
  arrow: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '700',
    marginHorizontal: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
