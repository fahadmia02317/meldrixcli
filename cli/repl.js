import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { search, select, input, password } from '@inquirer/prompts';
import fuzzy from 'fuzzy';
import { ContextManager } from './context.js';
import { ProviderManager } from './providers/manager.js';
import { extractFileModifications, computeDiff, formatTerminalDiff, applyFileChange } from './diff.js';
import { runInteractiveConfig } from './setup.js';
import { maskKey } from './config.js';

export class CodeCliRepl {
  constructor(providerManager, contextManager) {
    this.providerManager = providerManager;
    this.contextManager = contextManager;
    this.messages = [];
    this.rl = null;
    this.isGenerating = false;
    this.activeAgent = 'Build'; // Default agent name as seen in screenshot
  }

  renderStatusBar() {
    const model = this.providerManager.getActiveModel() || 'No Model';
    const provider = this.providerManager.activeProviderName || 'None';
    const speed = 'low'; // Mocked context/speed status
    
    const bar = chalk.bgHex('#1e1e1e').white(
      ` ${chalk.blue(this.activeAgent)} · ${chalk.bold(model)} ${chalk.dim(provider)} · ${chalk.yellow(speed)} `
    );
    
    process.stdout.write('\n' + bar + '\n');
  }

  renderFooter() {
    const hints = chalk.dim('tab') + ' agents  ' + chalk.dim('ctrl+p') + ' commands  ' + chalk.dim('esc') + ' cancel/stop';
    process.stdout.write(chalk.gray(`\n${' '.repeat(10)}${hints}\n`));
  }

  async handleConnectCommand() {
    try {
      if (this.rl) this.rl.pause();

      const providers = [
        { name: 'Google Gemini', value: 'gemini', category: 'Popular' },
        { name: 'OpenAI (ChatGPT Plus/Pro or API key)', value: 'openai', category: 'Popular' },
        { name: 'Anthropic (API key)', value: 'anthropic', category: 'Popular' },
        { name: 'OpenRouter (Recommended)', value: 'openrouter', category: 'Popular' },
        { name: 'Alibaba', value: 'dashscope', category: 'Popular' },
        { name: 'Groq', value: 'groq', category: 'Providers' },
        { name: 'Mistral', value: 'mistral', category: 'Providers' },
        { name: 'DeepSeek', value: 'deepseek', category: 'Providers' },
      ];

      const choices = providers.map(p => {
        const hasKey = !!this.providerManager.providers[p.value]?.config.apiKey;
        return {
          name: `${hasKey ? chalk.green('✓ ') : '  '}${p.name}`,
          value: p.value,
          group: p.category
        };
      });

      // Grouping logic for display
      const groupedChoices = [
        { name: chalk.blue.bold('\n Popular'), disabled: true },
        ...choices.filter(c => c.group === 'Popular'),
        { name: chalk.blue.bold('\n Providers'), disabled: true },
        ...choices.filter(c => c.group === 'Providers'),
      ];

      const selectedProvider = await select({
        message: 'Connect a provider',
        choices: groupedChoices,
        pageSize: 15
      });

      if (selectedProvider) {
        const apiKey = await password({
          message: `Enter API Key for ${selectedProvider}:`,
          validate: (val) => val.length > 0 || 'API Key is required'
        });

        let baseUrl = undefined;
        if (selectedProvider === 'openai' || selectedProvider === 'openrouter' || selectedProvider === 'dashscope') {
          baseUrl = await input({
            message: 'Custom Base URL (optional, press Enter for default):',
            default: this.providerManager.providers[selectedProvider]?.config.baseUrl
          });
        }

        // Update config
        const pObj = this.providerManager.providers[selectedProvider];
        if (pObj) {
          pObj.config.apiKey = apiKey;
          if (baseUrl) pObj.config.baseUrl = baseUrl;
          this.providerManager.saveConfigs();
          console.log(chalk.green(`\n✔ Successfully connected to ${selectedProvider}!`));
        }
      }
    } catch (err) {
      if (err.name !== 'ExitPromptError') {
        console.log(chalk.red(`\n✖ Error: ${err.message}`));
      }
    } finally {
      if (this.rl) {
        this.rl.resume();
        this.rl.prompt();
      }
    }
  }

  async showCommandOverlay() {
    try {
      if (this.rl) this.rl.pause();

      const commands = [
        { name: '/agents   Switch agent', value: '/agents' },
        { name: '/connect  Connect provider', value: '/connect' },
        { name: '/debug    View debug info', value: '/debug' },
        { name: '/diff     Open diff viewer', value: '/diff' },
        { name: '/editor   Open editor', value: '/editor' },
        { name: '/exit     Exit the app', value: '/exit' },
        { name: '/help     Help', value: '/help' },
        { name: '/init     Guided AGENTS.md setup', value: '/init' },
        { name: '/mcps     Toggle MCPs', value: '/mcps' },
        { name: '/models   Switch model', value: '/models' },
      ];

      const selected = await select({
        message: 'Commands',
        choices: commands,
        pageSize: 10
      });

      if (selected) {
        // Execute the selected command
        if (selected === '/connect') await this.handleConnectCommand();
        else if (selected === '/models') await this.handleModelCommand();
        else if (selected === '/exit') process.exit(0);
        else console.log(chalk.yellow(`\nCommand ${selected} is not yet implemented in this view.`));
      }
    } catch (err) {
      // Ignore cancel
    } finally {
      if (this.rl) {
        this.rl.resume();
        this.rl.prompt();
      }
    }
  }

  printBanner() {
    console.clear();
    console.log(chalk.bold.hex('#38bdf8')('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.hex('#38bdf8')('║ ') + chalk.bold.white('Code-CLI') + chalk.hex('#38bdf8')(' — Multi-Provider Terminal Coding Agent          ') + chalk.bold.hex('#38bdf8')('║'));
    console.log(chalk.bold.hex('#38bdf8')('╚══════════════════════════════════════════════════════════════╝'));
    console.log(
      chalk.dim('Provider: ') +
      chalk.bold.green(this.providerManager.activeProviderName) +
      chalk.dim('  Model: ') +
      chalk.bold.yellow(this.providerManager.getActiveModel()) +
      chalk.dim('  CWD: ') +
      chalk.cyan(path.basename(this.contextManager.baseDir) || '.')
    );
    console.log(chalk.dim('Type ') + chalk.cyan('/help') + chalk.dim(' for commands or ask anything to generate/refactor code.\n'));
  }

  getPromptString() {
    const provider = this.providerManager.activeProviderName;
    const model = this.providerManager.getActiveModel();
    const filesCount = this.contextManager.files.size;
    const contextTag = filesCount > 0 ? chalk.cyan(` [${filesCount} files]`) : '';
    return chalk.bold.green(`code-cli`) + chalk.dim(`(${provider}:${model})`) + contextTag + chalk.bold.white(' > ');
  }

  async start() {
    this.printBanner();
    this.renderStatusBar();
    this.renderFooter();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    this.promptUser();

    this.rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        this.promptUser();
        return;
      }

      if (input === '/') {
        await this.showCommandOverlay();
        this.promptUser();
        return;
      }

      if (input.startsWith('/')) {
        await this.handleSlashCommand(input);
        this.promptUser();
        return;
      }

      await this.handleUserPrompt(input);
      this.promptUser();
    });

    this.rl.on('close', () => {
      console.log(chalk.dim('\nGoodbye!'));
      process.exit(0);
    });
  }

  promptUser() {
    this.rl.setPrompt(this.getPromptString());
    this.rl.prompt();
  }

  async handleSlashCommand(commandStr) {
    const [cmd, ...args] = commandStr.split(' ');
    const argStr = args.join(' ').trim();

    switch (cmd.toLowerCase()) {
      case '/help':
        this.showHelp();
        break;

      case '/clear':
      case '/reset':
        this.messages = [];
        console.log(chalk.green('✔ Conversation history cleared. Context files remain loaded.'));
        break;

      case '/add':
        if (!argStr) {
          console.log(chalk.yellow('Usage: /add <file-or-directory-path>'));
          break;
        }
        const addResult = this.contextManager.addPath(argStr);
        if (addResult.added.length > 0) {
          console.log(chalk.green(`✔ Added ${addResult.added.length} file(s) to context:`));
          addResult.added.slice(0, 10).forEach(f => console.log(chalk.dim(`  + ${f}`)));
          if (addResult.added.length > 10) {
            console.log(chalk.dim(`  ...and ${addResult.added.length - 10} more.`));
          }
        }
        if (addResult.skipped.length > 0) {
          console.log(chalk.dim(`  (${addResult.skipped.length} ignored or binary files skipped)`));
        }
        if (addResult.errors.length > 0) {
          addResult.errors.forEach(e => console.log(chalk.red(`✖ ${e}`)));
        }
        break;

      case '/drop':
        if (!argStr) {
          console.log(chalk.yellow('Usage: /drop <file-path>'));
          break;
        }
        const dropped = this.contextManager.dropPath(argStr);
        if (dropped.length > 0) {
          console.log(chalk.green(`✔ Removed ${dropped.length} file(s) from context.`));
        } else {
          console.log(chalk.yellow(`No matching files in context for '${argStr}'.`));
        }
        break;

      case '/files':
        const summary = this.contextManager.listFiles();
        console.log(chalk.bold.cyan('\n📁 Active Context Files:'));
        if (summary.totalFiles === 0) {
          console.log(chalk.dim('  (No files added. Use /add <path> to load code into context)\n'));
        } else {
          summary.files.forEach(f => {
            console.log(chalk.white(`  • ${f.path}`) + chalk.dim(` (${f.lines} lines, ~${f.tokens} tokens)`));
          });
          console.log(chalk.dim(`\nTotal: ${summary.totalFiles} files, ${summary.totalLines} lines, ~${summary.totalTokens} tokens\n`));
        }
        break;

      case '/model':
      case '/models':
        await this.handleModelCommand(argStr);
        break;

      case '/connect':
        await this.handleConnectCommand();
        break;

      case '/config':
      case '/setup':
        this.rl.pause();
        await runInteractiveConfig(this.providerManager.config);
        this.rl.resume();
        this.printBanner();
        break;

      case '/status':
        this.showStatus();
        break;

      case '/exit':
      case '/quit':
        this.rl.close();
        break;

      default:
        console.log(chalk.yellow(`Unknown command '${cmd}'. Type /help for available commands.`));
        break;
    }
  }

  showHelp() {
    console.log(chalk.bold.cyan('\nAvailable Commands:'));
    console.log(chalk.white('  /help                 ') + chalk.dim('Show this help message'));
    console.log(chalk.white('  /add <path>           ') + chalk.dim('Add file or directory into context (e.g. /add src)'));
    console.log(chalk.white('  /drop <path>          ') + chalk.dim('Remove a file from active context'));
    console.log(chalk.white('  /files                ') + chalk.dim('List all files currently in active context'));
    console.log(chalk.white('  /model [index/name]   ') + chalk.dim('Switch model by index, name, or interactively'));
    console.log(chalk.white('  /config               ') + chalk.dim('Open interactive API key and endpoint configuration'));
    console.log(chalk.white('  /status               ') + chalk.dim('Display active provider, keys, and context tokens'));
    console.log(chalk.white('  /clear                ') + chalk.dim('Reset conversation history'));
    console.log(chalk.white('  /exit                 ') + chalk.dim('Exit the CLI agent\n'));
  }

  showStatus() {
    const config = this.providerManager.config;
    console.log(chalk.bold.cyan('\nAgent Status:'));
    console.log(chalk.white('  Active Provider : ') + chalk.bold.green(this.providerManager.activeProviderName));
    console.log(chalk.white('  Active Model    : ') + chalk.bold.yellow(this.providerManager.getActiveModel()));
    console.log(chalk.white('  Context Files   : ') + chalk.cyan(`${this.contextManager.files.size} files`));
    console.log(chalk.white('  Messages Stored : ') + chalk.cyan(`${this.messages.length} turns`));
    console.log(chalk.dim('\nProvider Configuration:'));
    for (const [key, prov] of Object.entries(config.providers)) {
      const activeMarker = key === this.providerManager.activeProviderName ? chalk.green(' (active)') : '';
      console.log(`  • ${prov.name} [${key}]: ${maskKey(prov.apiKey)}${activeMarker}`);
      if (prov.baseUrl) console.log(chalk.dim(`    Base URL: ${prov.baseUrl}`));
    }
    console.log('');
  }

  async handleModelCommand(argStr) {
    const allModels = [];
    const providers = Object.keys(this.providerManager.providers);
    
    for (const pId of providers) {
      const pObj = this.providerManager.providers[pId];
      const models = await pObj.listModels();
      
      // Determine provider tag
      let tag = pId.charAt(0).toUpperCase() + pId.slice(1);
      if (pId === 'gemini') tag = 'Google';
      if (pId === 'openai') tag = 'OpenAI';
      if (pId === 'dashscope') tag = 'Alibaba';
      if (pId === 'anthropic') tag = 'Anthropic';
      if (pId === 'openrouter') tag = 'OpenRouter';

      for (const m of models) {
        allModels.push({
          id: pId,
          model: m,
          tag: tag,
          name: `[${tag}] ${m}`
        });
      }
    }

    // 1. Direct Command Argument (Index Selection)
    if (argStr) {
      const index = parseInt(argStr, 10);
      if (!isNaN(index) && index > 0 && index <= allModels.length) {
        const selection = allModels[index - 1];
        this.providerManager.setActiveProviderAndModel(selection.id, selection.model);
        console.log(chalk.green(`✔ Switched to #${index}: ${selection.model} [${selection.tag}]`));
        return;
      }

      // Fallback: Direct syntax if user types "openai:gpt-4o"
      if (argStr.includes(':')) {
        const [prov, mod] = argStr.split(':');
        try {
          this.providerManager.setActiveProviderAndModel(prov.trim(), mod.trim());
          console.log(chalk.green(`✔ Switched to provider '${prov.trim()}' with model '${mod.trim()}'.`));
        } catch (err) {
          console.log(chalk.red(`✖ ${err.message}`));
        }
        return;
      }
    }

    // 2. Interactive Search Menu
    try {
      if (this.rl) this.rl.pause();

      const selectedValue = await search({
        message: 'Search and select a model:',
        source: async (input) => {
          if (!input) {
            return allModels.map((m, i) => ({
              name: `${i + 1}. ${m.model} [${m.tag}]`,
              value: m,
              description: `Provider: ${m.tag}`
            }));
          }

          const results = fuzzy.filter(input, allModels, {
            extract: (el) => el.name
          });

          return results.map((res) => ({
            name: `${res.index + 1}. ${res.original.model} [${res.original.tag}]`,
            value: res.original,
            description: `Provider: ${res.original.tag}`
          }));
        },
      });

      if (selectedValue) {
        this.providerManager.setActiveProviderAndModel(selectedValue.id, selectedValue.model);
        console.log(chalk.green(`\n✔ Switched to: ${selectedValue.model} [${selectedValue.tag}]`));
      }
    } catch (err) {
      // User likely cancelled (Ctrl+C)
      if (err.name !== 'ExitPromptError') {
        console.log(chalk.red(`\n✖ Error during selection: ${err.message}`));
      } else {
        console.log(chalk.dim('\nModel selection cancelled.'));
      }
    } finally {
      if (this.rl) {
        this.rl.resume();
        this.rl.prompt();
      }
    }
  }

  async handleUserPrompt(userText) {
    this.messages.push({ role: 'user', content: userText });

    // Prepare system prompt with coding instructions & file context
    const fileContext = this.contextManager.getSystemContext();
    const systemPrompt = [
      'You are Code-CLI, an expert Principal Software Engineer and CLI coding assistant.',
      'You provide clear, production-ready code, refactorings, explanations, and precise solutions.',
      'When modifying or writing files, always encapsulate files cleanly using the delimiter format:',
      '<<<FILE: relative/path/to/file.ext>>>',
      '[Full code content]',
      '<<<END_FILE>>>',
      'This allows the CLI to generate diffs and write changes directly to disk with user confirmation.',
      '',
      fileContext
    ].filter(Boolean).join('\n');

    console.log(chalk.dim('\nThinking & streaming response...\n'));

    let fullResponse = '';
    this.isGenerating = true;

    try {
      const result = await this.providerManager.streamChat(
        this.messages,
        { systemPrompt },
        (token) => {
          process.stdout.write(token);
        }
      );
      fullResponse = result.text;
      console.log('\n');
      this.messages.push({ role: 'assistant', content: fullResponse });

      // Check if the response contains file modifications to propose
      await this.checkForFileModifications(fullResponse);

    } catch (err) {
      console.log(chalk.red(`\n✖ Provider Error: ${err.message}\n`));
      // Remove failed turn to maintain conversation coherence
      this.messages.pop();
    } finally {
      this.isGenerating = false;
    }
  }

  async checkForFileModifications(responseText) {
    const modifications = extractFileModifications(responseText);
    if (modifications.length === 0) return;

    console.log(chalk.bold.yellow(`\n⚡ Agent proposed modifications for ${modifications.length} file(s).`));

    for (const mod of modifications) {
      const fullPath = path.resolve(this.contextManager.baseDir, mod.path);
      let oldContent = '';
      if (fs.existsSync(fullPath)) {
        try {
          oldContent = fs.readFileSync(fullPath, 'utf8');
        } catch (e) {
          oldContent = '';
        }
      }

      const diff = computeDiff(oldContent, mod.newContent);
      console.log(formatTerminalDiff(mod.path, diff.diffLines, diff.additions, diff.deletions));

      // Ask for confirmation
      const choice = await this.askConfirmation(
        chalk.bold.white(`Apply changes to ${chalk.yellow(mod.path)}? [Y]es / [N]o / [V]iew full: `)
      );

      if (choice.toLowerCase() === 'y' || choice.toLowerCase() === 'yes') {
        try {
          await applyFileChange(this.contextManager.baseDir, mod.path, mod.newContent);
          // If the file is in context, update its content
          this.contextManager.addPath(mod.path);
          console.log(chalk.bold.green(`✔ Wrote changes to ${mod.path}\n`));
        } catch (err) {
          console.log(chalk.red(`✖ Failed writing file: ${err.message}\n`));
        }
      } else if (choice.toLowerCase() === 'v' || choice.toLowerCase() === 'view') {
        console.log(chalk.cyan(`\n--- Full Content for ${mod.path} ---`));
        console.log(mod.newContent);
        console.log(chalk.cyan(`-------------------------------------\n`));
        const secondChoice = await this.askConfirmation(chalk.bold.white(`Apply now? [Y]es / [N]o: `));
        if (secondChoice.toLowerCase() === 'y') {
          await applyFileChange(this.contextManager.baseDir, mod.path, mod.newContent);
          this.contextManager.addPath(mod.path);
          console.log(chalk.bold.green(`✔ Wrote changes to ${mod.path}\n`));
        } else {
          console.log(chalk.dim(`Skipped ${mod.path}.\n`));
        }
      } else {
        console.log(chalk.dim(`Skipped ${mod.path}.\n`));
      }
    }
  }

  askConfirmation(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}
