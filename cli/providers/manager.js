import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { DashScopeProvider } from './dashscope.js';
import { OpenRouterProvider } from './openrouter.js';
import { saveConfig } from '../config.js';

export class ProviderManager {
  constructor(config) {
    this.config = config;
    this.providers = {
      gemini: new GeminiProvider(config.providers.gemini),
      openai: new OpenAIProvider(config.providers.openai),
      anthropic: new AnthropicProvider(config.providers.anthropic),
      dashscope: new DashScopeProvider(config.providers.dashscope),
      openrouter: new OpenRouterProvider(config.providers.openrouter || {
        apiKey: '',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'anthropic/claude-3.5-sonnet',
        models: [
          'anthropic/claude-3.7-sonnet',
          'anthropic/claude-3.5-sonnet',
          'deepseek/deepseek-r1',
          'deepseek/deepseek-chat',
          'meta-llama/llama-3.3-70b-instruct',
          'google/gemini-2.0-flash-001',
          'qwen/qwen-2.5-coder-32b-instruct',
          'openai/gpt-4o'
        ]
      })
    };
    this.activeProviderName = config.activeProvider || 'gemini';
    this.activeModel = config.activeModel || this.providers[this.activeProviderName]?.config?.defaultModel;
  }

  getActiveProvider() {
    const provider = this.providers[this.activeProviderName];
    if (!provider) {
      throw new Error(`Active provider '${this.activeProviderName}' is not recognized.`);
    }
    return provider;
  }

  getActiveModel() {
    return this.activeModel;
  }

  setActiveProviderAndModel(providerName, modelName) {
    if (!this.providers[providerName]) {
      throw new Error(`Provider '${providerName}' does not exist. Available: ${Object.keys(this.providers).join(', ')}`);
    }
    this.activeProviderName = providerName;
    this.activeModel = modelName || this.providers[providerName].config.defaultModel;

    this.config.activeProvider = this.activeProviderName;
    this.config.activeModel = this.activeModel;
    saveConfig(this.config);
  }

  async getAvailableModels(providerName = this.activeProviderName) {
    const provider = this.providers[providerName];
    if (!provider) return [];
    return await provider.listModels();
  }

  async streamChat(messages, options, onToken) {
    const provider = this.getActiveProvider();
    return await provider.streamChat(
      messages,
      {
        model: this.activeModel,
        systemPrompt: options?.systemPrompt
      },
      onToken
    );
  }

  updateProviderConfig(providerName, updates) {
    if (this.config.providers[providerName]) {
      this.config.providers[providerName] = {
        ...this.config.providers[providerName],
        ...updates
      };
      // Re-instantiate provider
      switch (providerName) {
        case 'gemini':
          this.providers.gemini = new GeminiProvider(this.config.providers.gemini);
          break;
        case 'openai':
          this.providers.openai = new OpenAIProvider(this.config.providers.openai);
          break;
        case 'anthropic':
          this.providers.anthropic = new AnthropicProvider(this.config.providers.anthropic);
          break;
        case 'dashscope':
          this.providers.dashscope = new DashScopeProvider(this.config.providers.dashscope);
          break;
        case 'openrouter':
          this.providers.openrouter = new OpenRouterProvider(this.config.providers.openrouter);
          break;
      }
      saveConfig(this.config);
    }
  }
}
