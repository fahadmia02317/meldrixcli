import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { ContextManager } from './context.js';
import { ProviderManager } from './providers/manager.js';
import { extractFileModifications, computeDiff, formatTerminalDiff, applyFileChange } from './diff.js';
import { runInteractiveConfig } from './setup.js';
import { maskKey } from './config.js';

export class CodeCliRepl {
  /**
   * @param {ProviderManager} providerManager 
   * @param {ContextManager} contextManager 
   */
  constructor(providerManager, contextManager) {
    this.providerManager = providerManager;
    this.contextManager = contextManager;
    this.messages = [];
    this.rl = null;
    this.isGenerating = false;
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
        await this.handleModelCommand(argStr);
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
    console.log(chalk.white('  /model [prov/model]   ') + chalk.dim('Switch active provider or model interactively'));
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
    if (argStr) {
      // Direct syntax: /model gemini:gemini-3.8-flash or /model openai:gpt-4o or /model gpt-4o
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

      // Check if matches a provider
      if (this.providerManager.providers[argStr.toLowerCase()]) {
        const prov = argStr.toLowerCase();
        const defModel = this.providerManager.providers[prov].config.defaultModel;
        this.providerManager.setActiveProviderAndModel(prov, defModel);
        console.log(chalk.green(`✔ Switched to provider '${prov}' (${defModel}).`));
        return;
      }
    }

    // Interactive listing
    console.log(chalk.bold.cyan('\nAvailable Providers & Models:'));
    const providers = Object.keys(this.providerManager.providers);
    for (let i = 0; i < providers.length; i++) {
      const pName = providers[i];
      const pObj = this.providerManager.providers[pName];
      const models = await pObj.listModels();
      const isActive = pName === this.providerManager.activeProviderName;
      console.log(
        chalk.bold(isActive ? chalk.green(`[${i + 1}] ${pObj.config.name} *ACTIVE*`) : chalk.white(`[${i + 1}] ${pObj.config.name}`)) +
        chalk.dim(` (${pName})`)
      );
      models.forEach(m => {
        const isCurrentModel = isActive && m === this.providerManager.getActiveModel();
        console.log(chalk.dim(`     - ${isCurrentModel ? chalk.yellow(`* ${m}`) : m}`));
      });
    }

    console.log(chalk.dim('\nTo switch, type: /model <provider>:<model>'));
    console.log(chalk.dim('Example: /model gemini:gemini-3.1-pro-preview or /model openai:gpt-4o\n'));
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
