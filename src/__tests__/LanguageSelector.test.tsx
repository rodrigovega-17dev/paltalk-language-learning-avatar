import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LanguageSelector, SUPPORTED_LANGUAGES } from '../components/LanguageSelector';

describe('LanguageSelector', () => {
  const mockOnLanguageSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all supported languages', () => {
    const { getByText } = render(
      <LanguageSelector
        selectedLanguage="english"
        onLanguageSelect={mockOnLanguageSelect}
      />
    );

    SUPPORTED_LANGUAGES.forEach((language) => {
      expect(getByText(language.name)).toBeTruthy();
      expect(getByText(language.flag)).toBeTruthy();
    });
  });

  it('should highlight the selected language', () => {
    const { getByText } = render(
      <LanguageSelector
        selectedLanguage="spanish"
        onLanguageSelect={mockOnLanguageSelect}
      />
    );

    const spanishOption = getByText('Spanish').parent?.parent;
    expect(spanishOption?.props.style).toEqual(
      expect.objectContaining({
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
      })
    );
  });

  it('should call onLanguageSelect when a language is pressed', () => {
    const { getByText } = render(
      <LanguageSelector
        selectedLanguage="english"
        onLanguageSelect={mockOnLanguageSelect}
      />
    );

    fireEvent.press(getByText('French'));
    expect(mockOnLanguageSelect).toHaveBeenCalledWith('french');
  });

  it('should not call onLanguageSelect when disabled', () => {
    const { getByText } = render(
      <LanguageSelector
        selectedLanguage="english"
        onLanguageSelect={mockOnLanguageSelect}
        disabled={true}
      />
    );

    fireEvent.press(getByText('French'));
    expect(mockOnLanguageSelect).not.toHaveBeenCalled();
  });

  it('should apply disabled styles when disabled', () => {
    const { getByText } = render(
      <LanguageSelector
        selectedLanguage="english"
        onLanguageSelect={mockOnLanguageSelect}
        disabled={true}
      />
    );

    const englishOption = getByText('English').parent?.parent;
    expect(englishOption?.props.style).toEqual(
      expect.objectContaining({
        opacity: 0.5,
      })
    );
  });

  it('should render the correct label', () => {
    const { getByText } = render(
      <LanguageSelector
        selectedLanguage="english"
        onLanguageSelect={mockOnLanguageSelect}
      />
    );

    expect(getByText('Target Language')).toBeTruthy();
  });

  it('should handle empty selection gracefully', () => {
    const { getByText } = render(
      <LanguageSelector
        selectedLanguage=""
        onLanguageSelect={mockOnLanguageSelect}
      />
    );

    // Should render without crashing
    expect(getByText('Target Language')).toBeTruthy();
    
    // No language should be highlighted
    SUPPORTED_LANGUAGES.forEach((language) => {
      const option = getByText(language.name).parent?.parent;
      expect(option?.props.style.borderColor).not.toBe('#007AFF');
    });
  });
});