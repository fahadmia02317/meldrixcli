# Code-CLI Agent

A production-ready multi-provider interactive CLI coding agent with streaming REPL, context awareness, file diffing, and dynamic model switching. Supports Google Gemini, OpenRouter (400+ models), OpenAI, Claude, and Qwen.

## Features

- **Multi-Provider Support**: Seamlessly switch between Gemini, OpenAI, Anthropic, DashScope (Qwen), and OpenRouter.
- **Context Awareness**: Add files or directories to the agent's context using `/add`.
- **Interactive Diffing**: Review and apply code changes with a line-by-line diff viewer.
- **Standalone Mode**: Run a single-file zero-dependency executable (`code-cli-standalone.cjs`).
- **Slash Commands**: Powerful commands like `/help`, `/files`, `/model`, `/config`, and `/clear`.

## Installation

### Method A: Modular Installation (Recommended for Development)

If you have cloned the repository, you can install it as a global CLI tool:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/fahadmia02317/meldrixcli
   cd your-repo-name
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Link globally**:
   ```bash
   npm link
   ```

4. **Configure your API keys**:
   ```bash
   code-cli --config
   ```

5. **Start the agent**:
   ```bash
   code-cli
   ```

### Method B: Standalone Script (Instant, No Dependencies)

If you just want the CLI without cloning the full repo:

1. **Download the standalone file**:
   ```bash
   curl -O https://raw.githubusercontent.com/your-username/your-repo-name/main/code-cli-standalone.cjs
   ```

2. **Run it with Node.js**:
   ```bash
   node code-cli-standalone.cjs
   ```

## Configuration

Your configuration (API keys and default models) is stored securely at `~/.my-code-cli/config.json`. You can update it anytime using the `/config` command inside the REPL or via `code-cli --config`.

## Available Slash Commands

- `/add <path>`: Recursively add files to context.
- `/drop <path>`: Remove a file from context.
- `/files`: List all files currently in context.
- `/model`: Change active provider or model.
- `/config`: Run interactive setup wizard.
- `/clear`: Clear conversation history.
- `/help`: Show the help menu.

## Tech Stack

- **CLI**: Node.js, Commander, Chalk.
- **UI**: React, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Express (for web preview and API proxying).
- **SDKs**: @google/genai, openai, @anthropic-ai/sdk.

## License

MIT
