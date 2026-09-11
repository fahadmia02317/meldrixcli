import { GoogleGenAI } from '@google/genai';
import { BaseProvider } from './base.js';

export class GeminiProvider extends BaseProvider {
  constructor(config) {
    super('gemini', config);
    this._client = null;
  }

  getClient() {
    if (!this._client) {
      if (!this.config.apiKey) {
        throw new Error('Gemini API key is not configured. Run /config or set GEMINI_API_KEY.');
      }
      this._client = new GoogleGenAI({
        apiKey: this.config.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return this._client;
  }

  async streamChat(messages, options, onToken) {
    const client = this.getClient();
    const modelName = options.model || this.config.defaultModel || 'gemini-3.8-flash';

    // Separate system instruction from conversational messages
    let systemInstruction = options.systemPrompt || '';
    const conversationContents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = systemInstruction ? `${systemInstruction}\n\n${msg.content}` : msg.content;
      } else {
        conversationContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    if (conversationContents.length === 0) {
      throw new Error('No user messages to send to Gemini.');
    }

    const responseStream = await client.models.generateContentStream({
      model: modelName,
      contents: conversationContents,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature: 0.2
      }
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        if (onToken) onToken(text);
      }
    }

    return { text: fullText };
  }

  async listModels() {
    // Return curated list of supported coding models
    return [
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite'
    ];
  }
}
