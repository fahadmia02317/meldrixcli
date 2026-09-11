#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../cli/config.js';
import { ProviderManager } from '../cli/providers/manager.js';
import { ContextManager } from '../cli/context.js';
import { CodeCliRepl } from '../cli/repl.js';
import { runInteractiveConfig } from '../cli/setup.js';

program
  .name('code-cli')
  .description('Production-ready multi-provider interactive CLI coding agent')
  .version('1.0.0')
  .option('-p, --provider <provider>', 'Specify active LLM provider (gemini, openai, anthropic, dashscope)')
  .option('-m, --model <model>', 'Specify model to use')
  .option('-a, --add <paths...>', 'Pre-load files or directories into context')
  .option('-c, --config', 'Open interactive configuration wizard')
  .option('-e, --eval <prompt>', 'Run a single one-shot prompt, stream output, and exit')
  .action(async (options) => {
    try {
      const config = loadConfig();

      if (options.config) {
        await runInteractiveConfig(config);
        return;
      }

      if (options.provider) {
        if (!config.providers[options.provider.toLowerCase()]) {
          console.error(chalk.red(`Error: Unknown provider '${options.provider}'.`));
          console.error(chalk.dim(`Available providers: gemini, openai, anthropic, dashscope`));
          process.exit(1);
        }
        config.activeProvider = options.provider.toLowerCase();
      }

      if (options.model) {
        config.activeModel = options.model;
      }

      const providerManager = new ProviderManager(config);
      const contextManager = new ContextManager(process.cwd());

      // Pre-load paths if provided
      if (options.add && options.add.length > 0) {
        for (const p of options.add) {
          const res = contextManager.addPath(p);
          if (res.added.length > 0) {
            console.log(chalk.dim(`Loaded ${res.added.length} file(s) from '${p}' into context.`));
          }
        }
      }

      // One-shot eval mode
      if (options.eval) {
        const activeProv = providerManager.getActiveProvider();
        console.log(chalk.dim(`[Code-CLI (${providerManager.activeProviderName}:${providerManager.getActiveModel()})]`));
        const fileContext = contextManager.getSystemContext();
        const systemPrompt = [
          'You are Code-CLI, an expert Principal Software Engineer and CLI coding assistant.',
          'When modifying or writing files, use: <<<FILE: relative/path/to/file>>> ... <<<END_FILE>>>',
          fileContext
        ].filter(Boolean).join('\n');

        const result = await providerManager.streamChat(
          [{ role: 'user', content: options.eval }],
          { systemPrompt },
          (token) => process.stdout.write(token)
        );
        console.log('\n');
        return;
      }

      // Interactive REPL mode
      const repl = new CodeCliRepl(providerManager, contextManager);
      await repl.start();

    } catch (err) {
      console.error(chalk.red(`\nFatal error: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
