import OpenAI from 'openai';
import { BaseProvider } from './base.js';

export class DashScopeProvider extends BaseProvider {
  constructor(config) {
    super('dashscope', config);
    this._client = null;
  }

  getClient() {
    if (!this._client) {
      if (!this.config.apiKey) {
        throw new Error('DashScope (Qwen) API key is not configured. Run /config or set DASHSCOPE_API_KEY.');
      }
      this._client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      });
    }
    return this._client;
  }

  async streamChat(messages, options, onToken) {
    const client = this.getClient();
    const modelName = options.model || this.config.defaultModel || 'qwen-max';

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
    return (
      this.config.models || [
        'qwen-max',
        'qwen-plus',
        'qwen-turbo',
        'qwen2.5-coder-32b-instruct',
        'qwen2.5-coder-7b-instruct',
        'qwen-vl-max'
      ]
    );
  }
}
