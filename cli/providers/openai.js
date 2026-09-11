import OpenAI from 'openai';
import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super('openai', config);
    this._client = null;
  }

  getClient() {
    if (!this._client) {
      if (!this.config.apiKey) {
        throw new Error('OpenAI API key is not configured. Run /config or set OPENAI_API_KEY.');
      }
      this._client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl || undefined
      });
    }
    return this._client;
  }

  async streamChat(messages, options, onToken) {
    const client = this.getClient();
    const modelName = options.model || this.config.defaultModel || 'gpt-4o';

    const formattedMessages = [];
    if (options.systemPrompt) {
      formattedMessages.push({ role: 'system', content: options.systemPrompt });
    }
    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    const stream = await client.chat.completions.create({
      model: modelName,
      messages: formattedMessages,
      stream: true,
      temperature: 0.2
    });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        if (onToken) onToken(delta);
      }
    }

    return { text: fullText };
  }

  async listModels() {
    try {
      if (this.config.apiKey) {
        const client = this.getClient();
        const list = await client.models.list();
        const modelIds = [];
        for await (const model of list) {
          if (
            model.id.includes('gpt') ||
            model.id.includes('o1') ||
            model.id.includes('o3') ||
            model.id.includes('claude') ||
            model.id.includes('deepseek') ||
            model.id.includes('llama') ||
            model.id.includes('qwen')
          ) {
            modelIds.push(model.id);
          }
        }
        if (modelIds.length > 0) {
          return modelIds.slice(0, 20); // Top 20 relevant models
        }
      }
    } catch (err) {
      // Fallback on network or auth error
    }

    return (
      this.config.models || [
        'gpt-4o',
        'gpt-4o-mini',
        'o1',
        'o3-mini',
        'gpt-4-turbo'
      ]
    );
  }
}
