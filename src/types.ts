export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'dashscope' | 'openrouter';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  isFree?: boolean;
  promptPrice?: string;
  completionPrice?: string;
  providerGroup?: string;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  badgeColor: string;
  defaultModel: string;
  models: string[];
  baseUrl?: string;
  apiKey?: string;
  description: string;
  docUrl: string;
}

export interface TerminalMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  proposedFiles?: Array<{
    path: string;
    content: string;
    applied?: boolean;
  }>;
}

export interface WorkspaceFile {
  path: string;
  content: string;
  language: string;
  inContext: boolean;
  lines: number;
  tokens: number;
}

export interface CliConfig {
  activeProvider: ProviderId;
  activeModel: string;
  providers: Record<ProviderId, {
    apiKey: string;
    baseUrl?: string;
    defaultModel: string;
  }>;
}
