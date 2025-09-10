import { ConversationContext } from '../types/conversation';
import { phoneticRulesService } from './phoneticRulesService';
import { config } from '../config/environment';

export interface SuggestionService {
  generateSuggestion(
    lastAiMessage: string, 
    context: ConversationContext,
    nativeLanguage: string,
    targetLanguage: string
  ): Promise<string>;
}

class DynamicSuggestionService implements SuggestionService {
  private getOpenAIApiKey(): string {
    // Use the new environment configuration system
    const apiKey = config.openaiApiKey;
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.warn('OpenAI API key not configured, using fallback suggestions');
      throw new Error('OpenAI API key not found');
    }
    return apiKey;
  }

  async generateSuggestion(
    lastAiMessage: string, 
    context: ConversationContext,
    nativeLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      // Debug logging to understand the issue
      console.log('SuggestionService DEBUG:');
      console.log('- lastAiMessage:', lastAiMessage);
      console.log('- nativeLanguage:', nativeLanguage);
      console.log('- targetLanguage:', targetLanguage);
      
      const apiKey = this.getOpenAIApiKey();

      // Build conversation history for context (like the original implementation)
      const conversationHistory = this.buildConversationContext(context);

      // Get language-specific rules for better prompts
      const rules = phoneticRulesService.getRulesForLanguagePair(nativeLanguage, targetLanguage);
      
      // Build system prompt with language-specific rules
      const systemPrompt = this.buildSystemPrompt(nativeLanguage, targetLanguage, rules);

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add conversation history if available (like the original)
      if (conversationHistory) {
        messages.push({
          role: 'user',
          content: conversationHistory
        });
      }

      // Add the current prompt (like the original)
      messages.push({
        role: 'user',
        content: `Teacher just said: "${lastAiMessage}"

What should the student REPLY directly to this? Give me the phonetic student response in the format: "phonetic pronunciation (correct grammar)"

IMPORTANT: Generate a STUDENT RESPONSE, not a phonetic version of the teacher's message.`
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 200
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.status, response.statusText);
        return this.getContextualFallback(lastAiMessage, context, nativeLanguage, targetLanguage);
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content?.trim();

      console.log('SuggestionService API Response:', suggestion);

      if (!suggestion) {
        console.log('SuggestionService: No suggestion received, using fallback');
        return this.getContextualFallback(lastAiMessage, context, nativeLanguage, targetLanguage);
      }

      // Validate and fix grammar if needed
      const validatedSuggestion = this.validateGrammar(suggestion, targetLanguage);
      console.log('SuggestionService Final Result:', validatedSuggestion);
      return validatedSuggestion;

    } catch (error) {
      console.error('Error generating suggestion:', error);
      console.log('SuggestionService: API failed, forcing specific fallback for help message');
      
      // For debugging: if the message is about help, return a specific student response
      if (lastAiMessage.toLowerCase().includes('help you with')) {
        const specificResponse = nativeLanguage === 'spanish' && targetLanguage === 'english' 
          ? 'ai want tu PRAK-tis spik-ing (I want to practice speaking)'
          : 'ai un-der-STAND (I understand)';
        console.log('SuggestionService: Using specific help response:', specificResponse);
        return specificResponse;
      }
      
      const fallback = this.getContextualFallback(lastAiMessage, context, nativeLanguage, targetLanguage);
      console.log('SuggestionService: Using fallback suggestion:', fallback);
      return fallback;
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

  private buildSystemPrompt(nativeLanguage: string, targetLanguage: string, rules: any): string {
    const nativeLangName = this.getLanguageNames()[nativeLanguage] || nativeLanguage;
    const targetLangName = this.getLanguageNames()[targetLanguage] || targetLanguage;

    if (rules) {
      // Build phonetic rules description
      const phoneticRulesText = rules.phoneticRules
        .map((rule: any) => `- "${rule.from}" → "${rule.to}": ${rule.description}`)
        .join('\n');

      return `You help ${nativeLangName} speakers learn ${targetLangName} pronunciation. The teacher just asked a question or made a statement. Suggest how the STUDENT should REPLY directly to that specific message.

CRITICAL INSTRUCTIONS:
1. Generate a STUDENT RESPONSE, not a phonetic version of the teacher's message
2. The phonetic part should be HOW TO PRONOUNCE the student's response USING ${nativeLangName} PHONETICS
3. The parentheses should contain the CORRECT GRAMMAR of the student's response IN ${targetLangName}

Format your response as: "phonetic pronunciation (correct grammar)"

EXAMPLES OF CORRECT FORMAT:
- Teacher: "How are you?" → Student response: "ai am FAIN (I am fine)"
- Teacher: "What's your favorite color?" → Student response: "ai LAIK blu (I like blue)"  
- Teacher: "Do you have any pets?" → Student response: "yes ai jav a kat (Yes, I have a cat)"
- Teacher: "That's great! Tell me more." → Student response: "it IS veri kyut (it is very cute)"
- Teacher: "What did you do yesterday?" → Student response: "ai GUENT tu skul (I went to school)"

EXAMPLES OF WRONG FORMATS (DO NOT DO THESE):
- Teacher: "How are you?" → WRONG: "hau ar yu (I am fine)" ❌
- Teacher: "How are you?" → WRONG: "I am fine (ai am FAIN)" ❌
- Teacher: "How are you?" → WRONG: "How are you (I am fine)" ❌
- Teacher: "How are you?" → WRONG: "sí (Oui)" ❌ ← MIXING LANGUAGES!

ONLY CORRECT FORMAT:
- Teacher: "How are you?" → CORRECT: "ai am FAIN (I am fine)" ✅

Phonetic rules for ${nativeLangName} speakers learning ${targetLangName}:
${phoneticRulesText}

Stress patterns:
${rules.stressPatterns.map((pattern: string) => `- ${pattern}`).join('\n')}

Common mistakes to avoid:
${rules.commonMistakes.map((mistake: string) => `- ${mistake}`).join('\n')}

REMEMBER: 
- Phonetic part = HOW TO PRONOUNCE the student's response
- Parentheses = CORRECT GRAMMAR of the student's response
- NEVER put correct grammar in the phonetic part
- NEVER put teacher's message in phonetic part

Only respond with the phonetic format, nothing else.`;
    } else {
      // Fallback for unsupported language pairs
      return `You help ${nativeLangName} speakers learn ${targetLangName}. The teacher just asked a question or made a statement. Suggest how the STUDENT should REPLY directly to that specific message.

CRITICAL INSTRUCTIONS:
1. Generate a STUDENT RESPONSE, not a phonetic version of the teacher's message
2. The phonetic part should be HOW TO PRONOUNCE the student's response USING ${nativeLangName} PHONETICS
3. The parentheses should contain the CORRECT GRAMMAR of the student's response IN ${targetLangName}

Format your response as: "phonetic pronunciation (correct grammar)"

EXAMPLES OF CORRECT FORMAT:
- Teacher: "How are you?" → Student response: "ai am FAIN (I am fine)"
- Teacher: "What's your favorite color?" → Student response: "ai LAIK blu (I like blue)"  
- Teacher: "Do you have any pets?" → Student response: "yes ai jav a kat (Yes, I have a cat)"

EXAMPLES OF WRONG FORMATS (DO NOT DO THESE):
- Teacher: "How are you?" → WRONG: "hau ar yu (I am fine)" ❌
- Teacher: "How are you?" → WRONG: "I am fine (ai am FAIN)" ❌
- Teacher: "How are you?" → WRONG: "How are you (I am fine)" ❌
- Teacher: "How are you?" → WRONG: "sí (Oui)" ❌ ← MIXING LANGUAGES!

ONLY CORRECT FORMAT:
- Teacher: "How are you?" → CORRECT: "ai am FAIN (I am fine)" ✅

Since specific phonetic rules for ${nativeLangName}-to-${targetLangName} are not available, use general pronunciation guidance:
- Use CAPITALS for stressed syllables
- Simplify complex sounds for easier pronunciation
- Focus on clear communication over perfect pronunciation

REMEMBER: 
- Phonetic part = HOW TO PRONOUNCE the student's response
- Parentheses = CORRECT GRAMMAR of the student's response
- NEVER put correct grammar in the phonetic part
- NEVER put teacher's message in phonetic part

Only respond with the phonetic format, nothing else.`;
    }
  }

  private getLanguageNames(): { [key: string]: string } {
    return {
      english: 'English',
      spanish: 'Spanish',
      french: 'French',
      german: 'German'
    };
  }

  private validateGrammar(suggestion: string, targetLanguage: string): string {
    // Extract the text in parentheses
    const match = suggestion.match(/^(.+?)\s*\((.+?)\)$/);
    if (!match) {
      return suggestion; // Return as-is if format is unexpected
    }

    const phoneticPart = match[1].trim();
    const grammarPart = match[2].trim();

    // Check if the AI made the common mistake of putting teacher's message phonetically
    const teacherPhrases = [
      'hau ar yu', 'wat ar yu', 'du yu hav', 'kan yu tel', 'wat did yu',
      'hau kæn ai', 'help yu', 'jelp yu', 'kan ai jelp',
      'how are you', 'what are you', 'do you have', 'can you tell', 'what did you',
      'how can i', 'help you'
    ];
    
    const phoneticLower = phoneticPart.toLowerCase();
    const isLikelyTeacherMessage = teacherPhrases.some(phrase => phoneticLower.includes(phrase));
    
    if (isLikelyTeacherMessage) {
      console.warn('Detected likely teacher message in phonetic part:', phoneticPart);
      console.warn('Using contextual fallback instead');
      // Return a proper student response for language learning help
      if (targetLanguage === 'english') {
        return 'ai want tu PRAK-tis spik-ing (I want to practice speaking)';
      }
      return 'ai un-der-STAND (I understand)';
    }

    // Check if the AI put correct grammar in the phonetic part (another common mistake)
    const correctGrammarPhrases = [
      'i am fine', 'i like blue', 'yes i have', 'i understand', 'i don\'t know',
      'thank you', 'i see', 'can you repeat', 'i think so', 'i went to'
    ];
    
    const isLikelyCorrectGrammar = correctGrammarPhrases.some(phrase => phoneticLower.includes(phrase));
    
    if (isLikelyCorrectGrammar) {
      console.warn('Detected correct grammar in phonetic part, using fallback');
      return this.getContextualFallback('', { conversationHistory: [], targetLanguage: '', nativeLanguage: '', cefrLevel: '' }, 'spanish', targetLanguage);
    }

    // Common grammar fixes for English
    if (targetLanguage === 'english') {
      let fixedGrammar = grammarPart;
      
      // Fix common issues
      fixedGrammar = fixedGrammar.replace(/\bI like blue\b/g, 'I like blue');
      fixedGrammar = fixedGrammar.replace(/\bI have cat\b/g, 'I have a cat');
      fixedGrammar = fixedGrammar.replace(/\bI went school\b/g, 'I went to school');
      fixedGrammar = fixedGrammar.replace(/\bI am fine\b/g, 'I am fine');
      fixedGrammar = fixedGrammar.replace(/\bI understand\b/g, 'I understand');
      fixedGrammar = fixedGrammar.replace(/\bI don't know\b/g, 'I don\'t know');
      fixedGrammar = fixedGrammar.replace(/\bI think so\b/g, 'I think so');
      fixedGrammar = fixedGrammar.replace(/\bThank you\b/g, 'Thank you');
      fixedGrammar = fixedGrammar.replace(/\bI see\b/g, 'I see');
      fixedGrammar = fixedGrammar.replace(/\bCan you repeat\b/g, 'Can you repeat?');
      
      // Ensure proper capitalization
      fixedGrammar = fixedGrammar.charAt(0).toUpperCase() + fixedGrammar.slice(1);
      
      return `${phoneticPart} (${fixedGrammar})`;
    }

    // For other languages, return as-is for now
    return suggestion;
  }

  private getContextualFallback(
    aiMessage: string, 
    context: ConversationContext,
    nativeLanguage: string,
    targetLanguage: string
  ): string {
    const message = aiMessage.toLowerCase();

    // Check conversation history for better context (like the original)
    const recentHistory = context.conversationHistory?.slice(-4) || [];
    const conversationText = recentHistory.map(msg => msg.content.toLowerCase()).join(' ');

    // Get language-specific fallbacks
    const fallbacks = this.getLanguageSpecificFallbacks(nativeLanguage, targetLanguage, message, conversationText);
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  private getLanguageSpecificFallbacks(
    nativeLanguage: string, 
    targetLanguage: string, 
    message: string,
    conversationText: string
  ): string[] {
    // Language-specific fallback patterns with conversation awareness
    const languageFallbacks: { [key: string]: { [key: string]: string[] } } = {
      'spanish-english': {
        greeting: ['ai am FAIN (I am fine)', 'ai LAIK blu (I like blue)', 'yes ai jav a kat (Yes, I have a cat)'],
        question: ['ai want tu PRAK-tis spik-ing (I want to practice speaking)', 'kan yu jelp mi wiz pro-nun-si-A-shun (Can you help me with pronunciation)', 'ai DONT nou (I don\'t know)', 'ai TINK so (I think so)'],
        general: ['TENK yu (Thank you)', 'ai SI (I see)', 'kan yu ri-PIT (Can you repeat?)']
      },
      'english-spanish': {
        greeting: ['estoy BIEN (I am fine)', 'me GUS-ta azul (I like blue)', 'sí, tengo un gato (Yes, I have a cat)'],
        question: ['en-TIEN-do (I understand)', 'no SE (I don\'t know)', 'creo que SÍ (I think so)'],
        general: ['gra-CIAS (Thank you)', 'ya VE-o (I see)', 'puedes re-PE-tir (Can you repeat?)']
      },
      'french-english': {
        greeting: ['ai am FAIN (I am fine)', 'ai LAIK blu (I like blue)', 'yes ai jav a kat (Yes, I have a cat)'],
        question: ['ai un-der-STAND (I understand)', 'ai DONT nou (I don\'t know)', 'ai TINK so (I think so)'],
        general: ['TENK yu (Thank you)', 'ai SI (I see)', 'kan yu ri-PIT (Can you repeat?)']
      },
      'german-english': {
        greeting: ['ai am FAIN (I am fine)', 'ai LAIK blu (I like blue)', 'yes ai jav a kat (Yes, I have a cat)'],
        question: ['ai un-der-STAND (I understand)', 'ai DONT nou (I don\'t know)', 'ai TINK so (I think so)'],
        general: ['TENK yu (Thank you)', 'ai SI (I see)', 'kan yu ri-PIT (Can you repeat?)']
      }
    };

    const key = `${nativeLanguage}-${targetLanguage}`;
    const languageSpecificFallbacks = languageFallbacks[key];
    
    if (languageSpecificFallbacks) {
      // Enhanced conversation-aware categorization (like the original)
      if (conversationText.includes('color') || message.includes('color')) {
        return languageSpecificFallbacks.greeting; // Use greeting category for color responses
      }
      if (conversationText.includes('family') || message.includes('family')) {
        return languageSpecificFallbacks.question; // Use question category for family responses
      }
      if (conversationText.includes('food') || message.includes('food') || message.includes('eat')) {
        return languageSpecificFallbacks.greeting; // Use greeting category for food responses
      }
      if (conversationText.includes('hobby') || conversationText.includes('free time')) {
        return languageSpecificFallbacks.greeting; // Use greeting category for hobby responses
      }
      if (conversationText.includes('work') || conversationText.includes('job')) {
        return languageSpecificFallbacks.question; // Use question category for work responses
      }

      // Direct reply patterns to teacher's questions/statements (like the original)
      if (message.includes('how are you') || message.includes('how do you feel')) {
        return languageSpecificFallbacks.greeting;
      }
      if (message.includes('how can i help') || message.includes('how can i help you') || message.includes('help you with')) {
        return languageSpecificFallbacks.question; // Use question category for help requests
      }
      if (message.includes('what is your name') || message.includes('your name')) {
        return languageSpecificFallbacks.question;
      }
      if (message.includes('where are you from') || message.includes('where do you live')) {
        return languageSpecificFallbacks.question;
      }
      if (message.includes('what do you like') || message.includes('favorite')) {
        return languageSpecificFallbacks.greeting;
      }
      if (message.includes('do you have') || message.includes('have any')) {
        return languageSpecificFallbacks.question;
      }
      if (message.includes('tell me about') || message.includes('describe')) {
        return languageSpecificFallbacks.general;
      }
      if (message.includes('do you understand') || message.includes('clear')) {
        return languageSpecificFallbacks.question;
      }
      if (message.includes('great') || message.includes('good job') || message.includes('excellent') || message.includes('perfect')) {
        return languageSpecificFallbacks.general;
      }
      if (message.includes('what did you do') || message.includes('yesterday') || message.includes('weekend')) {
        return languageSpecificFallbacks.question;
      }
      if (message.includes('can you') || message.includes('could you')) {
        return languageSpecificFallbacks.question;
      }
      if (message.includes('repeat') || message.includes('again')) {
        return languageSpecificFallbacks.general;
      }

      // Default to general category
      return languageSpecificFallbacks.general;
    }

    // Generic fallbacks for unsupported language pairs
    return [
      'yes (Yes)',
      'no (No)',
      'ai un-der-STAND (I understand)',
      'TENK yu (Thank you)',
      'ai DONT nou (I don\'t know)'
    ];
  }
}

export const suggestionService = new DynamicSuggestionService();