import { CEFRLevel } from '../components/CEFRLevelSelector';

export interface PhoneticRule {
  from: string;
  to: string;
  description: string;
  examples: string[];
}

export interface LanguagePairRules {
  nativeLanguage: string;
  targetLanguage: string;
  phoneticRules: PhoneticRule[];
  commonMistakes: string[];
  stressPatterns: string[];
  cefrAdaptations: {
    [key in CEFRLevel]: {
      complexity: 'basic' | 'intermediate' | 'advanced';
      focusAreas: string[];
      examplePhrases: string[];
    };
  };
}

export interface PhoneticRulesService {
  getRulesForLanguagePair(nativeLanguage: string, targetLanguage: string): LanguagePairRules | null;
  getSupportedLanguagePairs(): string[];
  applyPhoneticRules(text: string, rules: LanguagePairRules): string;
  getCommonMistakes(nativeLanguage: string, targetLanguage: string): string[];
}

class PhoneticRulesServiceImpl implements PhoneticRulesService {
  private languagePairRules: Map<string, LanguagePairRules> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // Spanish to English rules
    this.languagePairRules.set('spanish-english', {
      nativeLanguage: 'spanish',
      targetLanguage: 'english',
      phoneticRules: [
        {
          from: 'th',
          to: 'd',
          description: 'Spanish speakers often substitute "th" with "d"',
          examples: ['think → dink', 'three → dree', 'thank → dank']
        },
        {
          from: 'w',
          to: 'gu',
          description: 'Spanish "w" sound',
          examples: ['water → guater', 'work → guork', 'week → gueek']
        },
        {
          from: 'sh',
          to: 'ch',
          description: 'Spanish "sh" sound',
          examples: ['she → che', 'shop → chop', 'fish → fich']
        },
        {
          from: 'j',
          to: 'y',
          description: 'Spanish "j" sound',
          examples: ['job → yob', 'jump → yump', 'just → yust']
        },
        {
          from: 'ing',
          to: 'in',
          description: 'Simplified ending',
          examples: ['running → runnin', 'working → workin', 'playing → playin']
        }
      ],
      commonMistakes: [
        'Pronouncing "th" as "d"',
        'Substituting "w" with "gu"',
        'Using "ch" instead of "sh"',
        'Pronouncing "j" as "y"',
        'Dropping final "g" in "-ing"'
      ],
      stressPatterns: [
        'Use CAPITALS for stressed syllables',
        'English stress patterns differ from Spanish',
        'Focus on word stress for clarity'
      ],
      cefrAdaptations: {
        A1: {
          complexity: 'basic',
          focusAreas: ['Basic vowel sounds', 'Simple consonant substitutions'],
          examplePhrases: ['ai am FAIN (I am fine)', 'ai LAIK blu (I like blue)']
        },
        A2: {
          complexity: 'basic',
          focusAreas: ['Common consonant clusters', 'Basic stress patterns'],
          examplePhrases: ['ai GUENT tu skul (I went to school)', 'it IS veri kyut (it is very cute)']
        },
        B1: {
          complexity: 'intermediate',
          focusAreas: ['Complex consonant sounds', 'Word stress patterns'],
          examplePhrases: ['ai un-der-STAND (I understand)', 'kan yu ri-PIT (Can you repeat?)']
        },
        B2: {
          complexity: 'intermediate',
          focusAreas: ['Advanced consonant clusters', 'Sentence stress'],
          examplePhrases: ['ai TINK so (I think so)', 'mai NEIM is... (My name is...)']
        },
        C1: {
          complexity: 'advanced',
          focusAreas: ['Native-like pronunciation', 'Intonation patterns'],
          examplePhrases: ['guel it IS... (Well, it is...)', 'TENK yu (Thank you)']
        },
        C2: {
          complexity: 'advanced',
          focusAreas: ['Perfect pronunciation', 'Natural rhythm'],
          examplePhrases: ['yes ai jav (Yes, I have)', 'ai DONT nou (I don\'t know)']
        }
      }
    });

    // English to Spanish rules
    this.languagePairRules.set('english-spanish', {
      nativeLanguage: 'english',
      targetLanguage: 'spanish',
      phoneticRules: [
        {
          from: 'th',
          to: 's',
          description: 'English "th" becomes Spanish "s"',
          examples: ['think → sink', 'three → sree', 'thank → sank']
        },
        {
          from: 'h',
          to: '',
          description: 'Spanish often drops "h" sound',
          examples: ['hello → ello', 'house → ouse', 'help → elp']
        },
        {
          from: 'v',
          to: 'b',
          description: 'Spanish "v" and "b" are similar',
          examples: ['very → bery', 'voice → boice', 'visit → bisit']
        },
        {
          from: 'r',
          to: 'rr',
          description: 'Spanish rolled "r"',
          examples: ['car → carr', 'red → rred', 'run → rrun']
        }
      ],
      commonMistakes: [
        'Pronouncing "th" as "s"',
        'Dropping "h" sounds',
        'Confusing "v" and "b"',
        'Not rolling "r" sounds'
      ],
      stressPatterns: [
        'Spanish stress is more regular than English',
        'Focus on syllable stress patterns',
        'Use CAPITALS for stressed syllables'
      ],
      cefrAdaptations: {
        A1: {
          complexity: 'basic',
          focusAreas: ['Basic vowel sounds', 'Simple consonant sounds'],
          examplePhrases: ['estoy BIEN (I am fine)', 'me GUS-ta azul (I like blue)']
        },
        A2: {
          complexity: 'basic',
          focusAreas: ['Common consonant substitutions', 'Basic stress'],
          examplePhrases: ['tengo UN gato (I have a cat)', 'fui a la es-CUELA (I went to school)']
        },
        B1: {
          complexity: 'intermediate',
          focusAreas: ['Complex consonants', 'Word stress'],
          examplePhrases: ['en-TIEN-do (I understand)', 'puedes re-PE-tir (Can you repeat?)']
        },
        B2: {
          complexity: 'intermediate',
          focusAreas: ['Advanced sounds', 'Sentence stress'],
          examplePhrases: ['creo que SÍ (I think so)', 'mi NO-bre es... (My name is...)']
        },
        C1: {
          complexity: 'advanced',
          focusAreas: ['Native-like pronunciation', 'Intonation'],
          examplePhrases: ['bueno, es... (Well, it is...)', 'gra-CIAS (Thank you)']
        },
        C2: {
          complexity: 'advanced',
          focusAreas: ['Perfect pronunciation', 'Natural rhythm'],
          examplePhrases: ['sí, tengo (Yes, I have)', 'no SE (I don\'t know)']
        }
      }
    });

    // French to English rules
    this.languagePairRules.set('french-english', {
      nativeLanguage: 'french',
      targetLanguage: 'english',
      phoneticRules: [
        {
          from: 'th',
          to: 'z',
          description: 'French speakers often substitute "th" with "z"',
          examples: ['think → zink', 'three → zree', 'thank → zank']
        },
        {
          from: 'h',
          to: '',
          description: 'French often drops "h" sound',
          examples: ['hello → ello', 'house → ouse', 'help → elp']
        },
        {
          from: 'r',
          to: 'rr',
          description: 'French "r" sound',
          examples: ['red → rred', 'run → rrun', 'car → carr']
        }
      ],
      commonMistakes: [
        'Pronouncing "th" as "z"',
        'Dropping "h" sounds',
        'Using French "r" sound'
      ],
      stressPatterns: [
        'French stress patterns differ from English',
        'Focus on word stress for clarity'
      ],
      cefrAdaptations: {
        A1: {
          complexity: 'basic',
          focusAreas: ['Basic vowel sounds', 'Simple consonant substitutions'],
          examplePhrases: ['ai am FAIN (I am fine)', 'ai LAIK blu (I like blue)']
        },
        A2: {
          complexity: 'basic',
          focusAreas: ['Common consonant clusters', 'Basic stress patterns'],
          examplePhrases: ['ai GUENT tu skul (I went to school)', 'it IS veri kyut (it is very cute)']
        },
        B1: {
          complexity: 'intermediate',
          focusAreas: ['Complex consonant sounds', 'Word stress patterns'],
          examplePhrases: ['ai un-der-STAND (I understand)', 'kan yu ri-PIT (Can you repeat?)']
        },
        B2: {
          complexity: 'intermediate',
          focusAreas: ['Advanced consonant clusters', 'Sentence stress'],
          examplePhrases: ['ai TINK so (I think so)', 'mai NEIM is... (My name is...)']
        },
        C1: {
          complexity: 'advanced',
          focusAreas: ['Native-like pronunciation', 'Intonation patterns'],
          examplePhrases: ['guel it IS... (Well, it is...)', 'TENK yu (Thank you)']
        },
        C2: {
          complexity: 'advanced',
          focusAreas: ['Perfect pronunciation', 'Natural rhythm'],
          examplePhrases: ['yes ai jav (Yes, I have)', 'ai DONT nou (I don\'t know)']
        }
      }
    });

    // Spanish to French rules
    this.languagePairRules.set('spanish-french', {
      nativeLanguage: 'spanish',
      targetLanguage: 'french',
      phoneticRules: [
        {
          from: 'ou',
          to: 'u',
          description: 'French "ou" sound is like Spanish "u"',
          examples: ['oui → ui', 'nous → nu', 'tout → tu']
        },
        {
          from: 'j',
          to: 'zh',
          description: 'French "j" is like Spanish "zh" sound',
          examples: ['j\'aime → zhaym', 'je → zhe', 'jour → zhur']
        },
        {
          from: 'qu',
          to: 'k',
          description: 'French "qu" is like Spanish "k"',
          examples: ['que → ke', 'qui → ki', 'quoi → kua']
        },
        {
          from: 'r',
          to: 'rr',
          description: 'French "r" is rolled like Spanish "rr"',
          examples: ['merci → merrsi', 'parler → parrler', 'rire → rrir']
        },
        {
          from: 'gn',
          to: 'ñ',
          description: 'French "gn" is like Spanish "ñ"',
          examples: ['agneau → añó', 'signe → siñ', 'ligne → liñ']
        }
      ],
      commonMistakes: [
        'Pronouncing "ou" as "o" instead of "u"',
        'Not rolling "r" sounds',
        'Confusing French "j" with Spanish "j"',
        'Not nasalizing vowels properly'
      ],
      stressPatterns: [
        'French stress is usually on the last syllable',
        'Use CAPITALS for stressed syllables',
        'French rhythm is different from Spanish'
      ],
      cefrAdaptations: {
        A1: {
          complexity: 'basic',
          focusAreas: ['Basic vowel sounds', 'Simple consonant substitutions'],
          examplePhrases: ['ui, zhaym ma vil (Oui, j\'aime ma ville)', 'bon-ZHUR (Bonjour)', 'merr-SI (Merci)']
        },
        A2: {
          complexity: 'basic',
          focusAreas: ['Common consonant clusters', 'Basic stress patterns'],
          examplePhrases: ['zhaym travay-YER (J\'aime travailler)', 'zhaym la MU-zik (J\'aime la musique)', 'zhaym man-ZHE (J\'aime manger)']
        },
        B1: {
          complexity: 'intermediate',
          focusAreas: ['Complex consonant sounds', 'Word stress patterns'],
          examplePhrases: ['zhaym parr-LER fran-SE (J\'aime parler français)', 'zhaym voya-ZHE (J\'aime voyager)']
        },
        B2: {
          complexity: 'intermediate',
          focusAreas: ['Advanced consonant clusters', 'Sentence stress'],
          examplePhrases: ['zhaym bi-ZHO travay-YER (J\'aime beaucoup travailler)', 'zhaym la KU-li-nair (J\'aime la cuisine)']
        },
        C1: {
          complexity: 'advanced',
          focusAreas: ['Native-like pronunciation', 'Intonation patterns'],
          examplePhrases: ['zhaym parr-LER fran-SE (J\'aime parler français)', 'zhaym voya-ZHE (J\'aime voyager)']
        },
        C2: {
          complexity: 'advanced',
          focusAreas: ['Perfect pronunciation', 'Natural rhythm'],
          examplePhrases: ['zhaym bi-ZHO travay-YER (J\'aime beaucoup travailler)', 'zhaym la KU-li-nair (J\'aime la cuisine)']
        }
      }
    });

    // German to English rules
    this.languagePairRules.set('german-english', {
      nativeLanguage: 'german',
      targetLanguage: 'english',
      phoneticRules: [
        {
          from: 'th',
          to: 's',
          description: 'German speakers often substitute "th" with "s"',
          examples: ['think → sink', 'three → sree', 'thank → sank']
        },
        {
          from: 'w',
          to: 'v',
          description: 'German "w" is pronounced like English "v"',
          examples: ['water → vater', 'work → vork', 'week → veek']
        },
        {
          from: 'v',
          to: 'f',
          description: 'German "v" is pronounced like English "f"',
          examples: ['very → fery', 'voice → foice', 'visit → fisit']
        }
      ],
      commonMistakes: [
        'Pronouncing "th" as "s"',
        'Confusing "w" and "v" sounds',
        'Pronouncing "v" as "f"'
      ],
      stressPatterns: [
        'German stress patterns differ from English',
        'Focus on word stress for clarity'
      ],
      cefrAdaptations: {
        A1: {
          complexity: 'basic',
          focusAreas: ['Basic vowel sounds', 'Simple consonant substitutions'],
          examplePhrases: ['ai am FAIN (I am fine)', 'ai LAIK blu (I like blue)']
        },
        A2: {
          complexity: 'basic',
          focusAreas: ['Common consonant clusters', 'Basic stress patterns'],
          examplePhrases: ['ai GUENT tu skul (I went to school)', 'it IS veri kyut (it is very cute)']
        },
        B1: {
          complexity: 'intermediate',
          focusAreas: ['Complex consonant sounds', 'Word stress patterns'],
          examplePhrases: ['ai un-der-STAND (I understand)', 'kan yu ri-PIT (Can you repeat?)']
        },
        B2: {
          complexity: 'intermediate',
          focusAreas: ['Advanced consonant clusters', 'Sentence stress'],
          examplePhrases: ['ai TINK so (I think so)', 'mai NEIM is... (My name is...)']
        },
        C1: {
          complexity: 'advanced',
          focusAreas: ['Native-like pronunciation', 'Intonation patterns'],
          examplePhrases: ['guel it IS... (Well, it is...)', 'TENK yu (Thank you)']
        },
        C2: {
          complexity: 'advanced',
          focusAreas: ['Perfect pronunciation', 'Natural rhythm'],
          examplePhrases: ['yes ai jav (Yes, I have)', 'ai DONT nou (I don\'t know)']
        }
      }
    });
  }

  getRulesForLanguagePair(nativeLanguage: string, targetLanguage: string): LanguagePairRules | null {
    const key = `${nativeLanguage}-${targetLanguage}`;
    return this.languagePairRules.get(key) || null;
  }

  getSupportedLanguagePairs(): string[] {
    return Array.from(this.languagePairRules.keys());
  }

  applyPhoneticRules(text: string, rules: LanguagePairRules): string {
    let result = text.toLowerCase();
    
    // Apply phonetic rules in order
    for (const rule of rules.phoneticRules) {
      const regex = new RegExp(rule.from, 'gi');
      result = result.replace(regex, rule.to);
    }
    
    return result;
  }

  getCommonMistakes(nativeLanguage: string, targetLanguage: string): string[] {
    const rules = this.getRulesForLanguagePair(nativeLanguage, targetLanguage);
    return rules?.commonMistakes || [];
  }
}

export const phoneticRulesService = new PhoneticRulesServiceImpl();
