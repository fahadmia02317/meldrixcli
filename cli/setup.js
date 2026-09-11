import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import { loadConfig, saveConfig, maskKey, CONFIG_FILE } from './config.js';

/**
 * Runs an interactive CLI configuration wizard
 */
export async function runInteractiveConfig(existingConfig) {
  const config = existingConfig || loadConfig();
  const rl = readline.createInterface({ input, output });

  console.log(chalk.bold.cyan('\n⚙️  Code-CLI Configuration Setup Wizard'));
  console.log(chalk.dim(`Config file: ${CONFIG_FILE}\n`));

  try {
    // 1. Gemini
    console.log(chalk.bold.yellow('1. Google Gemini API:'));
    console.log(chalk.dim(`   Current Key: ${maskKey(config.providers.gemini.apiKey)}`));
    const geminiKey = await rl.question(chalk.white('   Enter Gemini API Key (press Enter to keep current): '));
    if (geminiKey.trim()) {
      config.providers.gemini.apiKey = geminiKey.trim();
    }

    // 2. OpenAI
    console.log(chalk.bold.green('\n2. OpenAI & OpenAI-Compatible:'));
    console.log(chalk.dim(`   Current Key: ${maskKey(config.providers.openai.apiKey)}`));
    const openaiKey = await rl.question(chalk.white('   Enter OpenAI API Key (press Enter to keep current): '));
    if (openaiKey.trim()) {
      config.providers.openai.apiKey = openaiKey.trim();
    }
    console.log(chalk.dim(`   Current Base URL: ${config.providers.openai.baseUrl || '(default: https://api.openai.com/v1)'}`));
    const openaiUrl = await rl.question(chalk.white('   Custom Base URL (e.g. Groq, OpenRouter, Ollama, press Enter to keep): '));
    if (openaiUrl.trim()) {
      config.providers.openai.baseUrl = openaiUrl.trim();
    }

    // 3. Anthropic
    console.log(chalk.bold.magenta('\n3. Anthropic Claude API:'));
    console.log(chalk.dim(`   Current Key: ${maskKey(config.providers.anthropic.apiKey)}`));
    const anthropicKey = await rl.question(chalk.white('   Enter Anthropic API Key (press Enter to keep current): '));
    if (anthropicKey.trim()) {
      config.providers.anthropic.apiKey = anthropicKey.trim();
    }

    // 4. Alibaba DashScope (Qwen)
    console.log(chalk.bold.blue('\n4. Alibaba Cloud / DashScope (Qwen):'));
    console.log(chalk.dim(`   Current Key: ${maskKey(config.providers.dashscope.apiKey)}`));
    const dashKey = await rl.question(chalk.white('   Enter DashScope API Key (press Enter to keep current): '));
    if (dashKey.trim()) {
      config.providers.dashscope.apiKey = dashKey.trim();
    }
    console.log(chalk.dim(`   Current Base URL: ${config.providers.dashscope.baseUrl}`));
    const dashUrl = await rl.question(chalk.white('   DashScope Base URL (press Enter to keep default): '));
    if (dashUrl.trim()) {
      config.providers.dashscope.baseUrl = dashUrl.trim();
    }

    // 5. OpenRouter (All Models)
    console.log(chalk.bold.red('\n5. OpenRouter (Access 400+ models - Claude, DeepSeek, Llama, Gemini, etc.):'));
    console.log(chalk.dim(`   Current Key: ${maskKey(config.providers.openrouter?.apiKey)}`));
    const openrouterKey = await rl.question(chalk.white('   Enter OpenRouter API Key (press Enter to keep current): '));
    if (openrouterKey.trim()) {
      if (!config.providers.openrouter) config.providers.openrouter = {};
      config.providers.openrouter.apiKey = openrouterKey.trim();
    }
    console.log(chalk.dim(`   Current Base URL: ${config.providers.openrouter?.baseUrl || 'https://openrouter.ai/api/v1'}`));
    const openrouterUrl = await rl.question(chalk.white('   OpenRouter Base URL (press Enter to keep default): '));
    if (openrouterUrl.trim()) {
      config.providers.openrouter.baseUrl = openrouterUrl.trim();
    }

    // 6. Default Provider
    console.log(chalk.bold.cyan('\n6. Active Default Provider:'));
    console.log(chalk.dim(`   Options: gemini, openai, anthropic, dashscope, openrouter (Current: ${config.activeProvider})`));
    const provChoice = await rl.question(chalk.white(`   Select active provider [${config.activeProvider}]: `));
    if (provChoice.trim() && config.providers[provChoice.trim().toLowerCase()]) {
      config.activeProvider = provChoice.trim().toLowerCase();
      config.activeModel = config.providers[config.activeProvider].defaultModel;
    }

    saveConfig(config);
    console.log(chalk.bold.green(`\n✔ Configuration successfully saved to ${CONFIG_FILE}`));
    console.log(chalk.dim(`Active provider: ${config.activeProvider} (${config.activeModel})\n`));
  } finally {
    rl.close();
  }

  return config;
}
