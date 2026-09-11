import OpenAI from 'openai';
import { BaseProvider } from './base.js';

export class OpenRouterProvider extends BaseProvider {
  constructor(config) {
    super('openrouter', config);
    this._client = null;
    this._cachedModels = null;
    this._cacheTime = 0;
  }

  getClient() {
    if (!this._client) {
      if (!this.config.apiKey) {
        throw new Error('OpenRouter API key is not configured. Run /config or set OPENROUTER_API_KEY.');
      }
      this._client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl || 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://ai.studio',
          'X-Title': 'Code-CLI Agent'
        }
      });
    }
    return this._client;
  }

  async streamChat(messages, options, onToken) {
    const client = this.getClient();
    const modelName = options.model || this.config.defaultModel || 'anthropic/claude-3.5-sonnet';

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
    const now = Date.now();
    if (this._cachedModels && now - this._cacheTime < 300000) {
      return this._cachedModels;
    }

    try {
      const headers = {
        'HTTP-Referer': 'https://ai.studio',
        'X-Title': 'Code-CLI Agent'
      };
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers,
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          const modelIds = data.data.map((m) => m.id);
          this._cachedModels = modelIds;
          this._cacheTime = now;
          return modelIds;
        }
      }
    } catch (err) {
      // Fallback on network error
    }

    return (
      this.config.models || [
        'anthropic/claude-3.7-sonnet',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-chat',
        'meta-llama/llama-3.3-70b-instruct',
        'google/gemini-2.0-flash-001',
        'qwen/qwen-2.5-coder-32b-instruct',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'mistralai/mistral-large-2411'
      ]
    );
  }
}
