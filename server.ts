import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Google GenAI Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(customKey?: string) {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    dashscopeConfigured: Boolean(process.env.DASHSCOPE_API_KEY),
    openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY)
  });
});

// Download standalone script
app.get('/api/cli/download/standalone', (req, res) => {
  const filePath = path.join(process.cwd(), 'code-cli-standalone.cjs');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="code-cli.cjs"');
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ error: 'Standalone file not found' });
  }
});

// Serve live source code for the in-app code inspector
app.get('/api/cli/source', (req, res) => {
  const reqPath = req.query.path as string;
  if (!reqPath || reqPath.includes('..') || path.isAbsolute(reqPath)) {
    return res.status(400).send('Invalid file path');
  }
  const fullPath = path.join(process.cwd(), reqPath);
  if (fs.existsSync(fullPath)) {
    res.type('text/plain').send(fs.readFileSync(fullPath, 'utf8'));
  } else {
    res.status(404).send('File not found');
  }
});

// In-memory cache for OpenRouter models (5 min TTL)
let openRouterCache: { timestamp: number; data: any[] } | null = null;

// Dedicated OpenRouter Models Catalog endpoint - fetches all live models
app.get('/api/cli/openrouter/models', async (req, res) => {
  const now = Date.now();
  if (openRouterCache && now - openRouterCache.timestamp < 300000) {
    return res.json({ models: openRouterCache.data, cached: true, total: openRouterCache.data.length });
  }

  try {
    const headers: Record<string, string> = {
      'HTTP-Referer': 'https://ai.studio',
      'X-Title': 'Code-CLI Agent'
    };
    const apiKey = (req.query.apiKey as string) || process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API responded with ${response.status}`);
    }

    const json = await response.json();
    const rawList = Array.isArray(json.data) ? json.data : [];

    const models = rawList.map((m: any) => {
      const promptNum = Number(m.pricing?.prompt || 0);
      const completionNum = Number(m.pricing?.completion || 0);
      const isFree = Boolean(m.id?.includes(':free') || (promptNum === 0 && completionNum === 0));

      return {
        id: m.id,
        name: m.name || m.id,
        description: m.description ? m.description.slice(0, 180) : '',
        context_length: m.context_length || 0,
        isFree,
        promptPrice: promptNum > 0 ? `$${(promptNum * 1000000).toFixed(2)}/1M` : 'Free',
        completionPrice: completionNum > 0 ? `$${(completionNum * 1000000).toFixed(2)}/1M` : 'Free',
        providerGroup: m.id?.includes('/') ? m.id.split('/')[0] : 'other'
      };
    });

    // Sort: free models first, then prominent providers (anthropic, deepseek, meta, google, openai)
    const priorityGroups = ['anthropic', 'deepseek', 'meta-llama', 'google', 'openai', 'qwen', 'mistralai'];
    models.sort((a: any, b: any) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      const aIdx = priorityGroups.indexOf(a.providerGroup);
      const bIdx = priorityGroups.indexOf(b.providerGroup);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    openRouterCache = { timestamp: now, data: models };
    res.json({ models, cached: false, total: models.length });

  } catch (err: any) {
    console.error('[OpenRouter Models] Fetch error:', err.message);
    // Fallback list of top OpenRouter models
    const fallbackList = [
      { id: 'anthropic/claude-3.7-sonnet', name: 'Anthropic: Claude 3.7 Sonnet', context_length: 200000, isFree: false, promptPrice: '$3.00/1M', completionPrice: '$15.00/1M', providerGroup: 'anthropic' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic: Claude 3.5 Sonnet', context_length: 200000, isFree: false, promptPrice: '$3.00/1M', completionPrice: '$15.00/1M', providerGroup: 'anthropic' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek: DeepSeek R1', context_length: 128000, isFree: false, promptPrice: '$0.55/1M', completionPrice: '$2.19/1M', providerGroup: 'deepseek' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek: DeepSeek V3', context_length: 128000, isFree: false, promptPrice: '$0.14/1M', completionPrice: '$0.28/1M', providerGroup: 'deepseek' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B Instruct', context_length: 128000, isFree: false, promptPrice: '$0.12/1M', completionPrice: '$0.30/1M', providerGroup: 'meta-llama' },
      { id: 'google/gemini-2.0-flash-001', name: 'Google: Gemini 2.0 Flash', context_length: 1048576, isFree: false, promptPrice: '$0.10/1M', completionPrice: '$0.40/1M', providerGroup: 'google' },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen: Qwen 2.5 Coder 32B', context_length: 32768, isFree: false, promptPrice: '$0.07/1M', completionPrice: '$0.16/1M', providerGroup: 'qwen' },
      { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', context_length: 128000, isFree: false, promptPrice: '$2.50/1M', completionPrice: '$10.00/1M', providerGroup: 'openai' },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o-mini', context_length: 128000, isFree: false, promptPrice: '$0.15/1M', completionPrice: '$0.60/1M', providerGroup: 'openai' },
      { id: 'mistralai/mistral-large-2411', name: 'Mistral: Mistral Large 2411', context_length: 128000, isFree: false, promptPrice: '$2.00/1M', completionPrice: '$6.00/1M', providerGroup: 'mistralai' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek: DeepSeek R1 (Free)', context_length: 128000, isFree: true, promptPrice: 'Free', completionPrice: 'Free', providerGroup: 'deepseek' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta: Llama 3.3 70B Instruct (Free)', context_length: 128000, isFree: true, promptPrice: 'Free', completionPrice: 'Free', providerGroup: 'meta-llama' }
    ];
    res.json({ models: fallbackList, cached: false, fallback: true, total: fallbackList.length, error: err.message });
  }
});

// Fetch provider models
app.post('/api/cli/models', async (req, res) => {
  const { provider, apiKey, baseUrl } = req.body;
  try {
    if (provider === 'gemini') {
      res.json({
        models: [
          'gemini-3.8-flash',
          'gemini-3.1-pro-preview',
          'gemini-flash-latest',
          'gemini-3.1-flash-lite'
        ]
      });
    } else if (provider === 'openai' || provider === 'dashscope') {
      const key = apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.DASHSCOPE_API_KEY);
      if (key) {
        const client = new OpenAI({
          apiKey: key,
          baseURL: baseUrl || (provider === 'dashscope' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1' : undefined)
        });
        const list = await client.models.list();
        const models: string[] = [];
        for await (const m of list) {
          models.push(m.id);
        }
        res.json({ models: models.slice(0, 25) });
      } else {
        res.json({
          models: provider === 'dashscope'
            ? ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-coder-32b-instruct']
            : ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo']
        });
      }
    } else if (provider === 'openrouter') {
      const key = apiKey || process.env.OPENROUTER_API_KEY;
      try {
        const headers: Record<string, string> = {
          'HTTP-Referer': 'https://ai.studio',
          'X-Title': 'Code-CLI Agent'
        };
        if (key) headers['Authorization'] = `Bearer ${key}`;
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers,
          signal: AbortSignal.timeout(6000)
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.data)) {
            const allIds = data.data.map((m: any) => m.id);
            return res.json({ models: allIds, total: allIds.length });
          }
        }
      } catch (e) {}

      res.json({
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
      });
    } else if (provider === 'anthropic') {
      res.json({
        models: [
          'claude-3-5-sonnet-latest',
          'claude-3-7-sonnet-latest',
          'claude-3-5-haiku-latest',
          'claude-3-opus-latest'
        ]
      });
    } else {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
  } catch (err: any) {
    res.json({
      fallback: true,
      error: err.message,
      models: provider === 'gemini'
        ? ['gemini-3.8-flash', 'gemini-3.1-pro-preview']
        : ['gpt-4o', 'gpt-4o-mini']
    });
  }
});

// Streaming Chat Completion Endpoint (SSE)
app.post('/api/cli/stream', async (req, res) => {
  const {
    provider = 'gemini',
    model = 'gemini-3.8-flash',
    messages = [],
    systemPrompt = '',
    apiKey = '',
    baseUrl = ''
  } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (provider === 'gemini') {
      const client = getGeminiClient(apiKey);
      const conversationContents: any[] = [];

      for (const msg of messages) {
        if (msg.role !== 'system') {
          conversationContents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }

      if (conversationContents.length === 0) {
        throw new Error('No user messages found in request.');
      }

      const responseStream = await client.models.generateContentStream({
        model,
        contents: conversationContents,
        config: {
          systemInstruction: systemPrompt || undefined,
          temperature: 0.2
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          sendEvent('token', { text });
        }
      }
      sendEvent('done', { status: 'completed' });
      res.end();

    } else if (provider === 'openai' || provider === 'dashscope') {
      const activeKey = apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.DASHSCOPE_API_KEY);
      if (!activeKey) {
        throw new Error(`API Key for ${provider} is missing. Please provide it in the Config modal or server environment.`);
      }

      const client = new OpenAI({
        apiKey: activeKey,
        baseURL: baseUrl || (provider === 'dashscope' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1' : undefined)
      });

      const formatted = [];
      if (systemPrompt) formatted.push({ role: 'system' as const, content: systemPrompt });
      for (const m of messages) {
        formatted.push({ role: m.role as any, content: m.content });
      }

      const stream = await client.chat.completions.create({
        model,
        messages: formatted,
        stream: true,
        temperature: 0.2
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          sendEvent('token', { text: delta });
        }
      }
      sendEvent('done', { status: 'completed' });
      res.end();

    } else if (provider === 'anthropic') {
      const activeKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!activeKey) {
        throw new Error('Anthropic API key is missing. Please provide it in the Config modal or server environment.');
      }

      const client = new Anthropic({
        apiKey: activeKey,
        baseURL: baseUrl || undefined
      });

      const anthropicMessages = [];
      for (const m of messages) {
        if (m.role !== 'system') {
          anthropicMessages.push({
            role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: m.content
          });
        }
      }

      const stream = await client.messages.stream({
        model,
        max_tokens: 4096,
        system: systemPrompt || undefined,
        messages: anthropicMessages
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && (event.delta as any)?.text) {
          sendEvent('token', { text: (event.delta as any).text });
        }
      }
      sendEvent('done', { status: 'completed' });
      res.end();

    } else if (provider === 'openrouter') {
      const activeKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!activeKey) {
        throw new Error('OpenRouter API key is missing. Please provide it in the Config modal or server environment.');
      }

      const client = new OpenAI({
        apiKey: activeKey,
        baseURL: baseUrl || 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://ai.studio',
          'X-Title': 'Code-CLI Agent'
        }
      });

      const formatted = [];
      if (systemPrompt) formatted.push({ role: 'system' as const, content: systemPrompt });
      for (const m of messages) {
        formatted.push({ role: m.role as any, content: m.content });
      }

      const stream = await client.chat.completions.create({
        model,
        messages: formatted,
        stream: true,
        temperature: 0.2
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          sendEvent('token', { text: delta });
        }
      }
      sendEvent('done', { status: 'completed' });
      res.end();

    } else {
      throw new Error(`Unsupported provider '${provider}'.`);
    }

  } catch (err: any) {
    sendEvent('error', { message: err.message });
    res.end();
  }
});

// Vite middleware or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Code-CLI Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
