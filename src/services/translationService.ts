import { Message } from '../types/conversation';
import { config } from '../config/environment';

export interface TranslationService {
  translateMessage(message: string, fromLanguage: string, toLanguage: string): Promise<string>;
  translateConversation(messages: Message[], fromLanguage: string, toLanguage: string): Promise<Message[]>;
}

// Language code mapping for Google Translate API
// Maps our friendly language names to ISO 639-1 codes
const LANGUAGE_CODE_MAP: { [key: string]: string } = {
  'english': 'en',
  'spanish': 'es',
  'french': 'fr',
  'german': 'de',
  'italian': 'it',
  'portuguese': 'pt',
  'russian': 'ru',
  'japanese': 'ja',
  'korean': 'ko',
  'chinese': 'zh',
  'arabic': 'ar',
  'hindi': 'hi',
  'dutch': 'nl',
  'polish': 'pl',
  'swedish': 'sv',
  'turkish': 'tr',
  'vietnamese': 'vi',
  'thai': 'th',
  'indonesian': 'id',
  'greek': 'el',
  'czech': 'cs',
  'danish': 'da',
  'finnish': 'fi',
  'hebrew': 'he',
  'hungarian': 'hu',
  'norwegian': 'no',
  'romanian': 'ro',
  'ukrainian': 'uk',
};

/**
 * Google Cloud Translation API v2 implementation
 *
 * Benefits over OpenAI:
 * - 50x faster (~100-200ms vs 1-3s)
 * - 75x cheaper ($20/1M chars vs $150/1M tokens)
 * - 500k characters free per month
 * - Purpose-built for translation
 * - Supports 100+ languages
 * - Batch translation support
 */
class GoogleTranslationService implements TranslationService {
  private baseUrl = 'https://translation.googleapis.com/language/translate/v2';

  private getApiKey(): string {
    const apiKey = config.googleTranslateApiKey;
    if (!apiKey || apiKey === 'your-google-api-key-here') {
      throw new Error('Google Translate API key not configured. Please add EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY to your .env.local file');
    }
    return apiKey;
  }

  private getLanguageCode(language: string): string {
    const normalizedLanguage = language.toLowerCase().trim();
    const code = LANGUAGE_CODE_MAP[normalizedLanguage];

    if (!code) {
      console.warn(`Language "${language}" not found in mapping, using as-is`);
      return normalizedLanguage;
    }

    return code;
  }

  async translateMessage(message: string, fromLanguage: string, toLanguage: string): Promise<string> {
    try {
      const apiKey = this.getApiKey();
      const sourceCode = this.getLanguageCode(fromLanguage);
      const targetCode = this.getLanguageCode(toLanguage);

      // Google Translate API v2 uses GET requests with query parameters
      const url = new URL(this.baseUrl);
      url.searchParams.append('key', apiKey);
      url.searchParams.append('q', message);
      url.searchParams.append('target', targetCode);
      if (sourceCode && sourceCode !== 'auto') {
        url.searchParams.append('source', sourceCode);
      }
      url.searchParams.append('format', 'text');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Translate API error:', response.status, errorText);
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.data?.translations?.[0]?.translatedText;

      if (!translatedText) {
        console.error('No translation returned from API');
        return message;
      }

      return translatedText;

    } catch (error) {
      console.error('Error translating message:', error);
      throw error; // Re-throw to let the caller handle it
    }
  }

  async translateConversation(messages: Message[], fromLanguage: string, toLanguage: string): Promise<Message[]> {
    try {
      const apiKey = this.getApiKey();
      const sourceCode = this.getLanguageCode(fromLanguage);
      const targetCode = this.getLanguageCode(toLanguage);

      // Extract all message contents for batch translation
      const textsToTranslate = messages.map(msg => msg.content);

      // Google Translate API v2 supports batch translation via multiple 'q' parameters
      const url = new URL(this.baseUrl);
      url.searchParams.append('key', apiKey);
      url.searchParams.append('target', targetCode);
      if (sourceCode && sourceCode !== 'auto') {
        url.searchParams.append('source', sourceCode);
      }
      url.searchParams.append('format', 'text');

      // Add each text as a separate 'q' parameter for batch translation
      textsToTranslate.forEach(text => {
        url.searchParams.append('q', text);
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Translate API error:', response.status, errorText);
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      const translations = data.data?.translations;

      if (!translations || translations.length !== messages.length) {
        console.error('Translation count mismatch');
        throw new Error('Translation failed: Invalid response');
      }

      // Map translations back to messages
      const translatedMessages = messages.map((message, index) => ({
        ...message,
        content: translations[index].translatedText,
        translated: true,
        originalContent: message.content
      }));

      return translatedMessages;

    } catch (error) {
      console.error('Error translating conversation:', error);
      throw error; // Re-throw to let the caller handle it
    }
  }
}

export const translationService = new GoogleTranslationService();
