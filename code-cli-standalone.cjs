#!/usr/bin/env node

/**
 * Code-CLI: Production-Grade Standalone Multi-Provider Interactive Coding Agent
 * 
 * Works out-of-the-box on any machine with Node.js 18+ without external dependencies!
 * Supported Providers: Google Gemini, OpenAI & Compatible, Anthropic Claude, Alibaba DashScope (Qwen)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ANSI Terminal Colors (Zero-dependency chalk replacement)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGray: '\x1b[100m'
};

const CONFIG_DIR = path.join(os.homedir(), '.my-code-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  activeProvider: 'gemini',
  activeModel: 'gemini-3.8-flash',
  providers: {
    gemini: {
      name: 'Google Gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      defaultModel: 'gemini-3.8-flash',
      models: ['gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-flash-latest', 'gemini-3.1-flash-lite']
    },
    openai: {
      name: 'OpenAI & Compatible',
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo']
    },
    anthropic: {
      name: 'Anthropic Claude',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      defaultModel: 'claude-3-5-sonnet-latest',
      models: ['claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest']
    },
    dashscope: {
      name: 'Alibaba DashScope (Qwen)',
      apiKey: process.env.DASHSCOPE_API_KEY || '',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'qwen-max',
      models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-coder-32b-instruct']
    },
    openrouter: {
      name: 'OpenRouter (All Models)',
      apiKey: process.env.OPENROUTER_API_KEY || '',
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function loadConfig() {
  ensureDir(CONFIG_DIR);
  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      Object.assign(config, fileData);
      if (fileData.providers) {
        for (const [k, v] of Object.entries(fileData.providers)) {
          if (config.providers[k]) Object.assign(config.providers[k], v);
        }
      }
    } catch (e) {}
  }
  // Fallbacks to env
  if (!config.providers.gemini.apiKey && process.env.GEMINI_API_KEY) config.providers.gemini.apiKey = process.env.GEMINI_API_KEY;
  if (!config.providers.openai.apiKey && process.env.OPENAI_API_KEY) config.providers.openai.apiKey = process.env.OPENAI_API_KEY;
  if (!config.providers.anthropic.apiKey && process.env.ANTHROPIC_API_KEY) config.providers.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
  if (!config.providers.dashscope.apiKey && process.env.DASHSCOPE_API_KEY) config.providers.dashscope.apiKey = process.env.DASHSCOPE_API_KEY;
  if (!config.providers.openrouter.apiKey && process.env.OPENROUTER_API_KEY) config.providers.openrouter.apiKey = process.env.OPENROUTER_API_KEY;
  return config;
}

function saveConfig(cfg) {
  ensureDir(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

function maskKey(k) {
  if (!k) return '(not set)';
  if (k.length <= 8) return '****';
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}

// File Context Store
class ContextStore {
  constructor() {
    this.files = new Map();
  }

  addPath(targetPath) {
    const full = path.resolve(process.cwd(), targetPath);
    const added = [];
    if (!fs.existsSync(full)) return { added, error: `Path not found: ${targetPath}` };
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      this._walk(full, added);
    } else {
      this._addFile(full, added);
    }
    return { added };
  }

  _walk(dir, added) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (['node_modules', '.git', 'dist', 'build'].includes(e.name)) continue;
      const f = path.join(dir, e.name);
      if (e.isDirectory()) this._walk(f, added);
      else this._addFile(f, added);
    }
  }

  _addFile(file, added) {
    const rel = path.relative(process.cwd(), file);
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('\0')) return;
      const lines = content.split('\n').length;
      this.files.set(rel, { content, lines, tokens: Math.ceil(content.length / 3.8) });
      added.push(rel);
    } catch (e) {}
  }

  drop(target) {
    return this.files.delete(target);
  }

  clear() {
    this.files.clear();
  }

  getSystemPrompt() {
    if (this.files.size === 0) return '';
    let out = '\n### ACTIVE CONTEXT FILES:\n';
    for (const [p, d] of this.files.entries()) {
      out += `--- FILE: ${p} (${d.lines} lines) ---\n\`\`\`\n${d.content}\n\`\`\`\n\n`;
    }
    out += 'When modifying files, write:\n<<<FILE: path/to/file.ext>>>\n[New Content]\n<<<END_FILE>>>\n';
    return out;
  }
}

// Universal Streaming Provider Client
async function streamCompletion(config, messages, systemPrompt, onToken) {
  const provKey = config.activeProvider;
  const prov = config.providers[provKey];
  const model = config.activeModel || prov.defaultModel;

  if (!prov.apiKey) {
    throw new Error(`API key for '${provKey}' is missing. Type /config to set it or configure env.`);
  }

  if (provKey === 'gemini') {
    // Gemini REST Streaming API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${prov.apiKey}`;
    const contents = [];
    for (const m of messages) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }
    const body = {
      contents,
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: { temperature: 0.2 }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'aistudio-build' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep remainder

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunkText) {
              fullText += chunkText;
              onToken(chunkText);
            }
          } catch (e) {}
        }
      }
    }
    return fullText;

  } else if (provKey === 'openai' || provKey === 'dashscope' || provKey === 'openrouter') {
    // OpenAI-compatible SSE Streaming API
    const baseUrl = prov.baseUrl ? prov.baseUrl.replace(/\/+$/, '') : (provKey === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
    const url = `${baseUrl}/chat/completions`;
    const formattedMessages = [];
    if (systemPrompt) formattedMessages.push({ role: 'system', content: systemPrompt });
    for (const m of messages) formattedMessages.push({ role: m.role, content: m.content });

    const reqHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${prov.apiKey}`
    };
    if (provKey === 'openrouter') {
      reqHeaders['HTTP-Referer'] = 'https://ai.studio';
      reqHeaders['X-Title'] = 'Code-CLI Agent';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        temperature: 0.2
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${prov.name} API error (${res.status}): ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') break;
          try {
            const data = JSON.parse(payload);
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onToken(delta);
            }
          } catch (e) {}
        }
      }
    }
    return fullText;

  } else if (provKey === 'anthropic') {
    // Anthropic Messages Streaming REST API
    const url = 'https://api.anthropic.com/v1/messages';
    const anthropicMessages = [];
    for (const m of messages) {
      anthropicMessages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': prov.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: anthropicMessages,
        system: systemPrompt || undefined,
        max_tokens: 4096,
        stream: true
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text;
              onToken(data.delta.text);
            }
          } catch (e) {}
        }
      }
    }
    return fullText;
  }
}

// Diff Extraction & Application
function extractModifications(text) {
  const mods = [];
  const regex = /<<<FILE:\s*([^\n\r>]+)>>>([\s\S]*?)<<<END_FILE>>>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let content = match[2];
    if (content.startsWith('\n')) content = content.slice(1);
    if (content.endsWith('\n')) content = content.slice(0, -1);
    mods.push({ path: match[1].trim(), content });
  }
  return mods;
}

// REPL Interface
async function runRepl() {
  const config = loadConfig();
  const context = new ContextStore();
  const history = [];

  console.clear();
  console.log(`${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║ ${c.white}Code-CLI${c.cyan} — Production Multi-Provider Coding Agent         ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.dim}Active: ${c.green}${config.activeProvider}${c.dim} | Model: ${c.yellow}${config.activeModel}${c.dim} | Type ${c.cyan}/help${c.dim} for commands.${c.reset}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  const ask = (query) => new Promise(res => rl.question(query, res));

  while (true) {
    const fileCount = context.files.size;
    const tag = fileCount > 0 ? ` ${c.cyan}[${fileCount} files]${c.reset}` : '';
    const prompt = `${c.bold}${c.green}code-cli${c.dim}(${config.activeProvider}:${config.activeModel})${tag}${c.white} > ${c.reset}`;
    
    const line = await ask(prompt);
    const input = line.trim();
    if (!input) continue;

    if (input.startsWith('/')) {
      const [cmd, ...args] = input.split(' ');
      const arg = args.join(' ').trim();

      if (cmd === '/help') {
        console.log(`\n${c.bold}${c.cyan}Available Commands:${c.reset}`);
        console.log(`  ${c.white}/add <path>       ${c.dim}Add file or directory to context${c.reset}`);
        console.log(`  ${c.white}/drop <path>      ${c.dim}Remove file from context${c.reset}`);
        console.log(`  ${c.white}/files            ${c.dim}List all files in active context${c.reset}`);
        console.log(`  ${c.white}/model            ${c.dim}Switch provider & model dynamically${c.reset}`);
        console.log(`  ${c.white}/config           ${c.dim}Configure API keys and base URLs${c.reset}`);
        console.log(`  ${c.white}/clear            ${c.dim}Reset conversation history${c.reset}`);
        console.log(`  ${c.white}/exit             ${c.dim}Quit Code-CLI${c.reset}\n`);
      } else if (cmd === '/clear') {
        history.length = 0;
        console.log(`${c.green}✔ Conversation cleared.${c.reset}\n`);
      } else if (cmd === '/add') {
        if (!arg) console.log(`${c.yellow}Usage: /add <file-or-dir>${c.reset}`);
        else {
          const res = context.addPath(arg);
          if (res.error) console.log(`${c.red}✖ ${res.error}${c.reset}`);
          else console.log(`${c.green}✔ Added ${res.added.length} file(s) into context.${c.reset}`);
        }
      } else if (cmd === '/drop') {
        if (context.drop(arg)) console.log(`${c.green}✔ Removed ${arg}${c.reset}`);
        else console.log(`${c.yellow}File not found in context.${c.reset}`);
      } else if (cmd === '/files') {
        console.log(`\n${c.bold}${c.cyan}Active Context Files (${context.files.size}):${c.reset}`);
        for (const [p, d] of context.files.entries()) {
          console.log(`  • ${p} (${d.lines} lines, ~${d.tokens} tokens)`);
        }
        console.log('');
      } else if (cmd === '/model') {
        console.log(`\n${c.bold}${c.cyan}Available Providers & Models:${c.reset}`);
        for (const [k, p] of Object.entries(config.providers)) {
          const isAct = k === config.activeProvider;
          console.log(`${isAct ? c.green : c.white}• [${k}] ${p.name} ${isAct ? '(ACTIVE)' : ''}${c.reset}`);
          p.models.forEach(m => console.log(`    - ${m}`));
        }
        const sel = await ask(`\n${c.white}Select provider [${config.activeProvider}]: ${c.reset}`);
        if (sel.trim() && config.providers[sel.trim().toLowerCase()]) {
          config.activeProvider = sel.trim().toLowerCase();
        }
        const prov = config.providers[config.activeProvider];
        const mSel = await ask(`${c.white}Select model [${prov.defaultModel}]: ${c.reset}`);
        if (mSel.trim()) config.activeModel = mSel.trim();
        else config.activeModel = prov.defaultModel;
        saveConfig(config);
        console.log(`${c.green}✔ Active: ${config.activeProvider} (${config.activeModel})${c.reset}\n`);
      } else if (cmd === '/config') {
        console.log(`\n${c.bold}${c.cyan}⚙️  Configuration Wizard:${c.reset}`);
        for (const [k, p] of Object.entries(config.providers)) {
          console.log(`\n${c.bold}${p.name} (${k}):${c.reset}`);
          console.log(`  Current Key: ${maskKey(p.apiKey)}`);
          const nKey = await ask(`  Enter new API Key (or press enter to keep): `);
          if (nKey.trim()) p.apiKey = nKey.trim();
          if (k === 'openai' || k === 'dashscope' || k === 'openrouter') {
            console.log(`  Current Base URL: ${p.baseUrl || '(default)'}`);
            const nUrl = await ask(`  Enter Base URL (or press enter to keep): `);
            if (nUrl.trim()) p.baseUrl = nUrl.trim();
          }
        }
        saveConfig(config);
        console.log(`\n${c.green}✔ Config saved to ${CONFIG_FILE}${c.reset}\n`);
      } else if (cmd === '/exit' || cmd === '/quit') {
        console.log(`${c.dim}Goodbye!${c.reset}`);
        process.exit(0);
      } else {
        console.log(`${c.yellow}Unknown command '${cmd}'. Type /help for options.${c.reset}`);
      }
      continue;
    }

    // Process user prompt
    history.push({ role: 'user', content: input });
    const systemPrompt = [
      'You are Code-CLI, an expert Principal Software Engineer coding assistant.',
      'Provide concise, accurate, production-ready code with diffs.',
      context.getSystemPrompt()
    ].filter(Boolean).join('\n');

    process.stdout.write(`\n${c.dim}Streaming response...${c.reset}\n\n`);

    try {
      const response = await streamCompletion(config, history, systemPrompt, (token) => {
        process.stdout.write(token);
      });
      process.stdout.write('\n\n');
      history.push({ role: 'assistant', content: response });

      // Check for code file modifications
      const mods = extractModifications(response);
      if (mods.length > 0) {
        console.log(`${c.bold}${c.yellow}⚡ Proposed ${mods.length} file change(s):${c.reset}`);
        for (const m of mods) {
          console.log(`\n${c.cyan}File: ${c.yellow}${m.path}${c.reset}`);
          const choice = await ask(`${c.white}Apply change to ${m.path}? [Y/n]: ${c.reset}`);
          if (choice.trim().toLowerCase() === 'y' || choice.trim() === '') {
            const fullPath = path.resolve(process.cwd(), m.path);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, m.content, 'utf8');
            context.addPath(m.path);
            console.log(`${c.green}✔ Saved ${m.path}${c.reset}`);
          } else {
            console.log(`${c.dim}Skipped ${m.path}${c.reset}`);
          }
        }
        console.log('');
      }

    } catch (err) {
      console.log(`\n${c.red}✖ Provider Error: ${err.message}${c.reset}\n`);
      history.pop();
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${c.bold}${c.cyan}Code-CLI (Standalone)${c.reset} — Multi-Provider Interactive Coding Agent

${c.bold}USAGE:${c.reset}
  node code-cli-standalone.cjs [options]

${c.bold}OPTIONS:${c.reset}
  -h, --help               Show this help message
  -v, --version            Show version number
  -c, --config             Run interactive API key & provider configuration wizard
  -p, --provider <name>    Set active provider (gemini, openai, anthropic, dashscope)
  -m, --model <model>      Set active model (e.g. gemini-3.8-flash, gpt-4o, claude-3-5-sonnet)
  -a, --add <path>         Pre-load file or directory into context
  -e, --eval <prompt>      Run a single prompt and exit

${c.bold}REPL SLASH COMMANDS:${c.reset}
  /add <path>              Add file or directory into context
  /drop <path>             Remove file from context
  /files                   List all loaded context files
  /model [prov:model]      Switch active provider or model
  /config                  Configure API keys and endpoints
  /clear                   Clear conversation history
  /help                    Show help menu
  /exit                    Quit the CLI
`);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('code-cli v1.0.0 (standalone zero-dep)');
    process.exit(0);
  }

  runRepl().catch(err => {
    console.error(`\n${c.red}Fatal Error: ${err.message}${c.reset}`);
    process.exit(1);
  });
}

module.exports = { runRepl, loadConfig, saveConfig, ContextStore };
