import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CEFRLevelSelector, CEFR_LEVELS } from '../components/CEFRLevelSelector';

describe('CEFRLevelSelector', () => {
  const mockOnLevelSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all CEFR levels', () => {
    const { getByText } = render(
      <CEFRLevelSelector
        selectedLevel="A1"
        onLevelSelect={mockOnLevelSelect}
      />
    );

    CEFR_LEVELS.forEach((levelInfo) => {
      expect(getByText(levelInfo.level)).toBeTruthy();
      expect(getByText(levelInfo.name)).toBeTruthy();
      expect(getByText(levelInfo.description)).toBeTruthy();
    });
  });

  it('should highlight the selected level', () => {
    const { getByText } = render(
      <CEFRLevelSelector
        selectedLevel="B2"
        onLevelSelect={mockOnLevelSelect}
      />
    );

    const b2Option = getByText('B2').parent?.parent;
    expect(b2Option?.props.style).toEqual(
      expect.objectContaining({
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
      })
    );
  });

  it('should call onLevelSelect when a level is pressed', () => {
    const { getByText } = render(
      <CEFRLevelSelector
        selectedLevel="A1"
        onLevelSelect={mockOnLevelSelect}
      />
    );

    fireEvent.press(getByText('Intermediate'));
    expect(mockOnLevelSelect).toHaveBeenCalledWith('B1');
  });

  it('should not call onLevelSelect when disabled', () => {
    const { getByText } = render(
      <CEFRLevelSelector
        selectedLevel="A1"
        onLevelSelect={mockOnLevelSelect}
        disabled={true}
      />
    );

    fireEvent.press(getByText('Intermediate'));
    expect(mockOnLevelSelect).not.toHaveBeenCalled();
  });

  it('should apply disabled styles when disabled', () => {
    const { getByText } = render(
      <CEFRLevelSelector
        selectedLevel="A1"
        onLevelSelect={mockOnLevelSelect}
        disabled={true}
      />
    );

    const a1Option = getByText('A1').parent?.parent;
    expect(a1Option?.props.style).toEqual(
      expect.objectContaining({
        opacity: 0.5,
      })
    );
  });

  it('should render the correct label', () => {
    const { getByText } = render(
      <CEFRLevelSelector
        selectedLevel="A1"
        onLevelSelect={mockOnLevelSelect}
      />
    );

    expect(getByText('Proficiency Level (CEFR)')).toBeTruthy();
  });

  it('should display level codes with correct styling', () => {
    const { getByText } = render(
      <CEFRLevelSelector
        selectedLevel="C1"
        onLevelSelect={mockOnLevelSelect}
      />
    );

    const c1Code = getByText('C1');
    // Check if the style array contains the expected properties
    const styles = Array.isArray(c1Code.props.style) ? c1Code.props.style : [c1Code.props.style];
    const hasCorrectColor = styles.some(style => style && style.color === '#007AFF');
    const hasCorrectFontSize = styles.some(style => style && style.fontSize === 20);
    const hasCorrectFontWeight = styles.some(style => style && style.fontWeight === '700');
    
    expect(hasCorrectColor).toBe(true);
    expect(hasCorrectFontSize).toBe(true);
    expect(hasCorrectFontWeight).toBe(true);
  });

  it('should handle all valid CEFR levels', () => {
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
    
    validLevels.forEach((level) => {
      const { getByText } = render(
        <CEFRLevelSelector
          selectedLevel={level}
          onLevelSelect={mockOnLevelSelect}
        />
      );

      const levelOption = getByText(level).parent?.parent;
      expect(levelOption?.props.style).toEqual(
        expect.objectContaining({
          borderColor: '#007AFF',
          backgroundColor: '#E3F2FD',
        })
      );
    });
  });
});