/**
 * Abstract Base Class for LLM Providers in Code-CLI
 */
export class BaseProvider {
  /**
   * @param {string} name Provider identifier (e.g. 'gemini', 'openai')
   * @param {object} config Provider configuration object
   */
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }

  /**
   * Validates if the provider has minimum configuration (e.g. apiKey)
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.config?.apiKey);
  }

  /**
   * Streams a chat completion
   * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
   * @param {object} options { model: string, systemPrompt?: string }
   * @param {(token: string) => void} onToken Callback for streaming tokens
   * @returns {Promise<{text: string, usage?: object}>}
   */
  async streamChat(messages, options, onToken) {
    throw new Error(`streamChat() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Fetches available models from the provider endpoint or returns fallback list
   * @returns {Promise<string[]>}
   */
  async listModels() {
    return this.config.models || [];
  }
}
