import { ConversationContext } from '../types/conversation';

export interface SuggestionService {
  generateSuggestion(lastAiMessage: string, context: ConversationContext): Promise<string>;
}

class DefaultSuggestionService implements SuggestionService {
  private getOpenAIApiKey(): string {
    // Use the same environment variable as the conversation service
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.warn('OpenAI API key not configured, using fallback suggestions');
      throw new Error('OpenAI API key not found');
    }
    return apiKey;
  }

  async generateSuggestion(lastAiMessage: string, context: ConversationContext): Promise<string> {
    try {
      const apiKey = this.getOpenAIApiKey();

      // Build conversation history for context
      const conversationHistory = this.buildConversationContext(context);

      const messages = [
        {
          role: 'system',
          content: `You help Spanish speakers learn English. The teacher just asked a question or made a statement. Suggest how the STUDENT should REPLY directly to that specific message.

IMPORTANT: Generate a DIRECT ANSWER to the teacher's question/statement, not a repeat or summary. Consider the suggestion should entice the continuation of the conversation, not end it.

Examples:
- Teacher: "How are you today?" → Student reply: "ai am FAIN" (I am fine)
- Teacher: "What's your favorite color?" → Student reply: "ai LAIK blu" (I like blue)  
- Teacher: "Do you have any pets?" → Student reply: "yes ai jav a kat" (yes I have a cat)
- Teacher: "That's great! Tell me more." → Student reply: "it IS veri kyut" (it is very cute)
- Teacher: "What did you do yesterday?" → Student reply: "ai GUENT tu skul" (I went to school)

Format your response as: "phonetic version (correct English)"

Phonetic rules for Spanish speakers:
- "th" → "d", "w" → "gu", "sh" → "ch", "j" → "y", "v" → "v", "ing" → "in"
- Use capitals for STRESS: "ai LAIK MU-sik (I like music)"

Examples:
- "ai am FAIN (I am fine)"
- "ai LAIK blu (I like blue)"
- "yes ai jav a kat (Yes, I have a cat)"

Only respond with this format, nothing else.`
        }
      ];

      // Add conversation history if available
      if (conversationHistory) {
        messages.push({
          role: 'user',
          content: conversationHistory
        });
      }

      // Add the current prompt
      messages.push({
        role: 'user',
        content: `Teacher just said: "${lastAiMessage}"

What should the student REPLY directly to this? Give me the phonetic student response:`
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.7,
          max_tokens: 200
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.status, response.statusText);
        return this.getContextualFallback(lastAiMessage, context);
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content?.trim();

      if (!suggestion) {
        return this.getContextualFallback(lastAiMessage, context);
      }

      return suggestion;

    } catch (error) {
      console.error('Error generating suggestion:', error);
      return this.getContextualFallback(lastAiMessage, context);
    }
  }

  private buildConversationContext(context: ConversationContext): string | null {
    if (!context.conversationHistory || context.conversationHistory.length === 0) {
      return null;
    }

    // Get the last few messages for context (limit to avoid token limits)
    const recentMessages = context.conversationHistory.slice(-6); // Last 6 messages

    const conversationText = recentMessages
      .map(msg => {
        const role = msg.role === 'assistant' ? 'Teacher' : 'Student';
        return `${role}: "${msg.content}"`;
      })
      .join('\n');

    return `Recent conversation:\n${conversationText}`;
  }

  private getContextualFallback(aiMessage: string, context: ConversationContext): string {
    const message = aiMessage.toLowerCase();

    // Check conversation history for better context
    const recentHistory = context.conversationHistory?.slice(-4) || [];
    const conversationText = recentHistory.map(msg => msg.content.toLowerCase()).join(' ');

    // Context-aware responses based on conversation flow
    if (conversationText.includes('color') || message.includes('color')) {
      return "ai LAIK red (I like red)";
    }
    if (conversationText.includes('family') || message.includes('family')) {
      return "ai jav TU sis-ters (I have two sisters)";
    }
    if (conversationText.includes('food') || message.includes('food') || message.includes('eat')) {
      return "ai LAIK pi-sa (I like pizza)";
    }
    if (conversationText.includes('hobby') || conversationText.includes('free time')) {
      return "ai LAIK MU-sik (I like music)";
    }
    if (conversationText.includes('work') || conversationText.includes('job')) {
      return "ai am a stu-DENT (I am a student)";
    }

    // Direct reply patterns to teacher's questions/statements
    if (message.includes('how are you') || message.includes('how do you feel')) {
      return "ai am FAIN (I am fine)";
    }
    if (message.includes('what is your name') || message.includes('your name')) {
      return "mai NEIM is... (My name is...)";
    }
    if (message.includes('where are you from') || message.includes('where do you live')) {
      return "ai am from... (I am from...)";
    }
    if (message.includes('what do you like') || message.includes('favorite')) {
      return "ai LAIK MU-sik (I like music)";
    }
    if (message.includes('do you have') || message.includes('have any')) {
      return "yes ai jav (Yes, I have)";
    }
    if (message.includes('tell me about') || message.includes('describe')) {
      return "guel it IS... (Well, it is...)";
    }
    if (message.includes('do you understand') || message.includes('clear')) {
      return "yes ai un-der-STAND (Yes, I understand)";
    }
    if (message.includes('great') || message.includes('good job') || message.includes('excellent') || message.includes('perfect')) {
      return "TENK yu (Thank you)";
    }
    if (message.includes('what did you do') || message.includes('yesterday') || message.includes('weekend')) {
      return "ai GUENT tu... (I went to...)";
    }
    if (message.includes('can you') || message.includes('could you')) {
      return "yes ai kan (Yes, I can)";
    }
    if (message.includes('repeat') || message.includes('again')) {
      return "yes PLIS (Yes, please)";
    }

    // General student responses
    const fallbacks = [
      "ai SI (I see)",
      "TENK yu (Thank you)",
      "ai un-der-STAND (I understand)",
      "kan yu ri-PIT (Can you repeat?)",
      "ai DONT nou (I don't know)",
      "yes (Yes)",
      "ai TINK so (I think so)",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

export const suggestionService = new DefaultSuggestionService();