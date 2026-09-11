import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.js';

export class AnthropicProvider extends BaseProvider {
  constructor(config) {
    super('anthropic', config);
    this._client = null;
  }

  getClient() {
    if (!this._client) {
      if (!this.config.apiKey) {
        throw new Error('Anthropic API key is not configured. Run /config or set ANTHROPIC_API_KEY.');
      }
      this._client = new Anthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl || undefined
      });
    }
    return this._client;
  }

  async streamChat(messages, options, onToken) {
    const client = this.getClient();
    const modelName = options.model || this.config.defaultModel || 'claude-3-5-sonnet-latest';

    let systemPrompt = options.systemPrompt || '';
    const anthropicMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    if (anthropicMessages.length === 0) {
      throw new Error('No user messages to send to Anthropic.');
    }

    const stream = await client.messages.stream({
      model: modelName,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: anthropicMessages
    });

    let fullText = '';
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta &&
        event.delta.type === 'text_delta'
      ) {
        const text = event.delta.text;
        fullText += text;
        if (onToken) onToken(text);
      }
    }

    return { text: fullText };
  }

  async listModels() {
    return (
      this.config.models || [
        'claude-3-5-sonnet-latest',
        'claude-3-7-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-opus-latest'
      ]
    );
  }
}
