import { Message } from '../types/conversation';

export interface TranslationService {
  translateMessage(message: string, fromLanguage: string, toLanguage: string): Promise<string>;
  translateConversation(messages: Message[], fromLanguage: string, toLanguage: string): Promise<Message[]>;
}

class OpenAITranslationService implements TranslationService {
  private getOpenAIApiKey(): string {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      throw new Error('OpenAI API key not found');
    }
    return apiKey;
  }

  async translateMessage(message: string, fromLanguage: string, toLanguage: string): Promise<string> {
    try {
      const apiKey = this.getOpenAIApiKey();

      const messages = [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${fromLanguage} to ${toLanguage}. 

IMPORTANT RULES:
- Only return the translated text, nothing else
- Maintain the original tone and context
- Keep proper grammar and natural language flow
- If the text is already in ${toLanguage}, return it unchanged
- Do not add explanations or comments`
        },
        {
          role: 'user',
          content: message
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.3,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        console.error('Translation API error:', response.status, response.statusText);
        return message; // Return original message if translation fails
      }

      const data = await response.json();
      const translation = data.choices?.[0]?.message?.content?.trim();

      return translation || message;

    } catch (error) {
      console.error('Error translating message:', error);
      return message; // Return original message if translation fails
    }
  }

  async translateConversation(messages: Message[], fromLanguage: string, toLanguage: string): Promise<Message[]> {
    try {
      // Translate all messages in parallel for better performance
      const translationPromises = messages.map(async (message) => {
        const translatedContent = await this.translateMessage(message.content, fromLanguage, toLanguage);
        return {
          ...message,
          content: translatedContent,
          translated: true,
          originalContent: message.content
        };
      });

      const translatedMessages = await Promise.all(translationPromises);
      return translatedMessages;

    } catch (error) {
      console.error('Error translating conversation:', error);
      return messages; // Return original messages if translation fails
    }
  }
}

export const translationService = new OpenAITranslationService();




