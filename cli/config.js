import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';

// Load any local .env file if present
dotenv.config();

export const CONFIG_DIR = path.join(os.homedir(), '.my-code-cli');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export const DEFAULT_CONFIG = {
  activeProvider: 'gemini',
  activeModel: 'gemini-3.8-flash',
  providers: {
    gemini: {
      name: 'Google Gemini',
      apiKey: '',
      baseUrl: '',
      defaultModel: 'gemini-3.8-flash',
      models: [
        'gemini-3.8-flash',
        'gemini-3.1-pro-preview',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite'
      ]
    },
    openai: {
      name: 'OpenAI & Compatible',
      apiKey: '',
      baseUrl: '',
      defaultModel: 'gpt-4o',
      models: [
        'gpt-4o',
        'gpt-4o-mini',
        'o1',
        'o3-mini',
        'gpt-4-turbo'
      ]
    },
    anthropic: {
      name: 'Anthropic Claude',
      apiKey: '',
      baseUrl: '',
      defaultModel: 'claude-3-5-sonnet-latest',
      models: [
        'claude-3-5-sonnet-latest',
        'claude-3-7-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-opus-latest'
      ]
    },
    dashscope: {
      name: 'Alibaba Cloud / DashScope (Qwen)',
      apiKey: '',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'qwen-max',
      models: [
        'qwen-max',
        'qwen-plus',
        'qwen-turbo',
        'qwen2.5-coder-32b-instruct',
        'qwen2.5-coder-7b-instruct'
      ]
    },
    openrouter: {
      name: 'OpenRouter (All Models)',
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
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'mistralai/mistral-large-2411',
        'deepseek/deepseek-r1:free',
        'meta-llama/llama-3.3-70b-instruct:free'
      ]
    }
  }
};

/**
 * Ensures ~/.my-code-cli directory exists
 */
export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Loads configuration from file, merging with defaults and env vars
 */
export function loadConfig() {
  ensureConfigDir();
  let fileConfig = {};

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      fileConfig = JSON.parse(raw);
    } catch (err) {
      console.warn(`[Config] Warning: Failed to parse ${CONFIG_FILE}, using defaults.`);
    }
  }

  // Deep merge default with fileConfig
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  if (fileConfig.activeProvider) config.activeProvider = fileConfig.activeProvider;
  if (fileConfig.activeModel) config.activeModel = fileConfig.activeModel;

  if (fileConfig.providers) {
    for (const [key, val] of Object.entries(fileConfig.providers)) {
      if (config.providers[key]) {
        config.providers[key] = { ...config.providers[key], ...val };
      } else {
        config.providers[key] = val;
      }
    }
  }

  // Fallback to process.env if keys are missing
  if (!config.providers.gemini.apiKey && process.env.GEMINI_API_KEY) {
    config.providers.gemini.apiKey = process.env.GEMINI_API_KEY;
  }
  if (!config.providers.openai.apiKey && process.env.OPENAI_API_KEY) {
    config.providers.openai.apiKey = process.env.OPENAI_API_KEY;
  }
  if (!config.providers.openai.baseUrl && process.env.OPENAI_BASE_URL) {
    config.providers.openai.baseUrl = process.env.OPENAI_BASE_URL;
  }
  if (!config.providers.anthropic.apiKey && process.env.ANTHROPIC_API_KEY) {
    config.providers.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (!config.providers.dashscope.apiKey && process.env.DASHSCOPE_API_KEY) {
    config.providers.dashscope.apiKey = process.env.DASHSCOPE_API_KEY;
  }
  if (!config.providers.openrouter.apiKey && process.env.OPENROUTER_API_KEY) {
    config.providers.openrouter.apiKey = process.env.OPENROUTER_API_KEY;
  }
  if (!config.providers.openrouter.baseUrl && process.env.OPENROUTER_BASE_URL) {
    config.providers.openrouter.baseUrl = process.env.OPENROUTER_BASE_URL;
  }

  return config;
}

/**
 * Saves configuration to ~/.my-code-cli/config.json with restrictive permissions
 */
export function saveConfig(newConfig) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  });
}

/**
 * Masks an API key for safe terminal display (e.g. "sk-a1...8b9c")
 */
export function maskKey(key) {
  if (!key) return '(not configured)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
