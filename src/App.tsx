import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TerminalComponent } from './components/Terminal';
import { WorkspaceFiles } from './components/WorkspaceFiles';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { SetupGuide } from './components/CliDownloadModal';
import { DiffViewerModal } from './components/DiffViewerModal';
import { ConfigModal } from './components/ConfigModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { INITIAL_WORKSPACE_FILES } from './sampleFiles';
import { ProviderId, ProviderConfig, TerminalMessage, WorkspaceFile, CliConfig } from './types';

const DEFAULT_PROVIDERS: Record<ProviderId, ProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badgeColor: 'bg-blue-500',
    defaultModel: 'gemini-3.8-flash',
    models: [
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite'
    ],
    description: 'Fast, multimodal, high-context reasoning and code generation.',
    docUrl: 'https://ai.google.dev'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI & Compatible',
    badgeColor: 'bg-emerald-500',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo'],
    description: 'Supports OpenAI direct as well as Groq, OpenRouter, and local Ollama.',
    docUrl: 'https://platform.openai.com'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    badgeColor: 'bg-amber-500',
    defaultModel: 'claude-3-5-sonnet-latest',
    models: [
      'claude-3-5-sonnet-latest',
      'claude-3-7-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-opus-latest'
    ],
    description: 'Claude 3.5 Sonnet and Opus for precise code architectures.',
    docUrl: 'https://docs.anthropic.com'
  },
  dashscope: {
    id: 'dashscope',
    name: 'Alibaba Cloud (Qwen)',
    badgeColor: 'bg-purple-500',
    defaultModel: 'qwen-max',
    models: [
      'qwen-max',
      'qwen-plus',
      'qwen-turbo',
      'qwen2.5-coder-32b-instruct',
      'qwen2.5-coder-7b-instruct'
    ],
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    description: 'Qwen 2.5 Coder and Qwen-Max via OpenAI-compatible endpoint.',
    docUrl: 'https://help.aliyun.com/document_detail/2712195.html'
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (All Models)',
    badgeColor: 'bg-rose-500',
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
    ],
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Unified gateway providing live access to 400+ models from Anthropic, DeepSeek, Meta, Google, OpenAI, Mistral, and free tier models.',
    docUrl: 'https://openrouter.ai/models'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'workspace' | 'source' | 'setup'>('terminal');
  const [activeProvider, setActiveProvider] = useState<ProviderId>('gemini');
  const [activeModel, setActiveModel] = useState<string>('gemini-3.8-flash');
  const [isStreaming, setIsStreaming] = useState(false);

  // Configuration state
  const [config, setConfig] = useState<CliConfig>({
    activeProvider: 'gemini',
    activeModel: 'gemini-3.8-flash',
    providers: {
      gemini: { apiKey: '', defaultModel: 'gemini-3.8-flash' },
      openai: { apiKey: '', baseUrl: '', defaultModel: 'gpt-4o' },
      anthropic: { apiKey: '', defaultModel: 'claude-3-5-sonnet-latest' },
      dashscope: {
        apiKey: '',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultModel: 'qwen-max'
      },
      openrouter: {
        apiKey: '',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'anthropic/claude-3.5-sonnet'
      }
    }
  });

  // Workspace mock files
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(INITIAL_WORKSPACE_FILES);

  // Terminal REPL Conversation History
  const [messages, setMessages] = useState<TerminalMessage[]>([
    {
      id: 'init-sys',
      role: 'system',
      content: 'Code-CLI initialized in workspace. Active: Google Gemini (gemini-3.8-flash). Loaded 1 file into context (src/calculator.ts).',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  // Modals state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [diffModal, setDiffModal] = useState<{
    filePath: string;
    originalContent: string;
    proposedContent: string;
  } | null>(null);

  // Context files count
  const inContextCount = workspaceFiles.filter((f) => f.inContext).length;

  const handleProviderChange = (provider: ProviderId, model: string) => {
    setActiveProvider(provider);
    setActiveModel(model);
    setMessages((prev) => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        role: 'system',
        content: `Switched provider to ${DEFAULT_PROVIDERS[provider].name} [${model}].`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Toggle file context
  const handleToggleContext = (filePath: string) => {
    setWorkspaceFiles((prev) =>
      prev.map((f) => (f.path === filePath ? { ...f, inContext: !f.inContext } : f))
    );
  };

  // Update file content
  const handleUpdateFileContent = (filePath: string, newContent: string) => {
    setWorkspaceFiles((prev) =>
      prev.map((f) => {
        if (f.path === filePath) {
          const lines = newContent.split('\n').length;
          const tokens = Math.ceil(newContent.length / 3.8);
          return { ...f, content: newContent, lines, tokens };
        }
        return f;
      })
    );
  };

  // Create file
  const handleCreateFile = (filePath: string, content: string) => {
    const ext = filePath.split('.').pop() || 'text';
    const lines = content.split('\n').length;
    const tokens = Math.ceil(content.length / 3.8);
    const newFile: WorkspaceFile = {
      path: filePath,
      content,
      language: ext,
      inContext: true,
      lines,
      tokens
    };
    setWorkspaceFiles((prev) => [...prev, newFile]);
    setMessages((prev) => [
      ...prev,
      {
        id: `newfile-${Date.now()}`,
        role: 'system',
        content: `Created file '${filePath}' and loaded into context.`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Apply proposed file change from AI
  const handleApplyFileChange = (filePath: string, newContent: string) => {
    const existing = workspaceFiles.find((f) => f.path === filePath);
    if (existing) {
      handleUpdateFileContent(filePath, newContent);
    } else {
      handleCreateFile(filePath, newContent);
    }

    // Mark as applied in messages
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.proposedFiles) return m;
        return {
          ...m,
          proposedFiles: m.proposedFiles.map((pf) =>
            pf.path === filePath ? { ...pf, applied: true } : pf
          )
        };
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `apply-${Date.now()}`,
        role: 'system',
        content: `✔ Wrote changes to ${filePath}. File updated in workspace.`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // View Diff
  const handleViewDiff = (filePath: string, proposedContent: string) => {
    const current = workspaceFiles.find((f) => f.path === filePath);
    setDiffModal({
      filePath,
      originalContent: current?.content || '',
      proposedContent
    });
  };

  // Parse proposed file blocks from AI text response
  const extractProposedFiles = (text: string) => {
    const files: Array<{ path: string; content: string; applied?: boolean }> = [];
    const delimiterRegex = /<<<FILE:\s*([^\n\r>]+)>>>([\s\S]*?)<<<END_FILE>>>/g;
    let match;
    while ((match = delimiterRegex.exec(text)) !== null) {
      const p = match[1].trim();
      let c = match[2];
      if (c.startsWith('\n')) c = c.slice(1);
      if (c.endsWith('\n')) c = c.slice(0, -1);
      files.push({ path: p, content: c, applied: false });
    }
    return files;
  };

  // Send message to streaming endpoint
  const handleSendMessage = async (userText: string) => {
    // Handle slash commands in terminal
    const trimmed = userText.trim();
    if (trimmed.startsWith('/add')) {
      const targetPath = trimmed.replace('/add', '').trim();
      if (!targetPath) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system',
            content: 'Usage: /add <file-path>',
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
        return;
      }
      const matched = workspaceFiles.find(
        (f) => f.path === targetPath || f.path.startsWith(targetPath)
      );
      if (matched) {
        setWorkspaceFiles((prev) =>
          prev.map((f) =>
            f.path === matched.path ? { ...f, inContext: true } : f
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userText,
            timestamp: new Date().toLocaleTimeString()
          },
          {
            id: `sys-${Date.now()}`,
            role: 'system',
            content: `✔ Added '${matched.path}' into agent context (~${matched.tokens} tokens).`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userText,
            timestamp: new Date().toLocaleTimeString()
          },
          {
            id: `err-${Date.now()}`,
            role: 'system',
            content: `Path '${targetPath}' not found in workspace. Available: ${workspaceFiles.map((f) => f.path).join(', ')}`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
      return;
    }

    if (trimmed.startsWith('/drop')) {
      const targetPath = trimmed.replace('/drop', '').trim();
      setWorkspaceFiles((prev) =>
        prev.map((f) =>
          f.path === targetPath ? { ...f, inContext: false } : f
        )
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userText,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: `✔ Removed '${targetPath}' from active context.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    if (trimmed === '/files') {
      const inContext = workspaceFiles.filter((f) => f.inContext);
      const listSummary =
        inContext.length === 0
          ? 'No files currently in context. Use /add <file> or click in Workspace tab.'
          : inContext
              .map((f) => `• ${f.path} (${f.lines} lines, ~${f.tokens} tokens)`)
              .join('\n');

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userText,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: `files-${Date.now()}`,
          role: 'system',
          content: `Active Context Files (${inContext.length}):\n${listSummary}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    if (trimmed === '/help') {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userText,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: `help-${Date.now()}`,
          role: 'system',
          content: `Available Commands:\n  /add <path>       Add file or directory into context\n  /drop <path>      Remove file from context\n  /files            List all loaded files in context\n  /model            Switch active provider or model\n  /config           Configure API keys and custom base URLs\n  /clear            Reset conversation history\n  /help             Show this help menu`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    // Standard AI Generation turn
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newMessages: TerminalMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: userText,
        timestamp: new Date().toLocaleTimeString()
      }
    ];

    setMessages([
      ...newMessages,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true
      }
    ]);

    setIsStreaming(true);

    // Build system prompt with loaded workspace files
    const inContext = workspaceFiles.filter((f) => f.inContext);
    let systemPrompt =
      'You are Code-CLI, an expert Principal Software Engineer and CLI coding assistant.\n' +
      'Provide concise, accurate, production-ready code with diffs.\n' +
      'When modifying or writing files, always wrap the file using the delimiter format:\n' +
      '<<<FILE: relative/path/to/file.ext>>>\n' +
      '[Full code content]\n' +
      '<<<END_FILE>>>\n\n';

    if (inContext.length > 0) {
      systemPrompt += '### ACTIVE FILES IN CONTEXT:\n';
      for (const f of inContext) {
        systemPrompt += `--- FILE: ${f.path} (${f.lines} lines) ---\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n\n`;
      }
    }

    try {
      // Build conversation payload (filter out pure system logs for API)
      const apiConversation = newMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const currentProviderConfig = config.providers[activeProvider];

      const response = await fetch('/api/cli/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          model: activeModel,
          messages: apiConversation,
          systemPrompt,
          apiKey: currentProviderConfig?.apiKey || '',
          baseUrl: currentProviderConfig?.baseUrl || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('event: ')) {
            const eventName = line.replace('event: ', '').trim();
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && nextLine.startsWith('data: ')) {
              i++;
              try {
                const payload = JSON.parse(nextLine.replace('data: ', ''));
                if (eventName === 'token' && payload.text) {
                  accumulatedText += payload.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: accumulatedText }
                        : m
                    )
                  );
                } else if (eventName === 'error') {
                  throw new Error(payload.message || 'Stream error');
                }
              } catch (e) {}
            }
          }
        }
      }

      // Finalize message and extract any proposed files
      const proposed = extractProposedFiles(accumulatedText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: accumulatedText,
                isStreaming: false,
                proposedFiles: proposed.length > 0 ? proposed : undefined
              }
            : m
        )
      );

    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  (m.content ? m.content + '\n\n' : '') +
                  `[Error]: ${err.message}. If using a custom provider or key, check /config.`,
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `clear-${Date.now()}`,
        role: 'system',
        content: 'Conversation history reset. Files in workspace context remain active.',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProvider={activeProvider}
        activeModel={activeModel}
        onProviderChange={handleProviderChange}
        providers={DEFAULT_PROVIDERS}
        openConfig={() => setConfigModalOpen(true)}
        openDownload={() => setActiveTab('setup')}
        contextCount={inContextCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && (
          <TerminalComponent
            messages={messages}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            activeProvider={activeProvider}
            activeModel={activeModel}
            onClearHistory={handleClearHistory}
            onApplyFileChange={handleApplyFileChange}
            onViewDiff={handleViewDiff}
            workspaceFiles={workspaceFiles}
            onAddFileToContext={handleToggleContext}
            openConfig={() => setConfigModalOpen(true)}
            openModelSelector={() => setModelModalOpen(true)}
          />
        )}

        {activeTab === 'workspace' && (
          <WorkspaceFiles
            files={workspaceFiles}
            onToggleContext={handleToggleContext}
            onUpdateFileContent={handleUpdateFileContent}
            onCreateFile={handleCreateFile}
          />
        )}

        {activeTab === 'source' && <SourceCodeViewer />}

        {activeTab === 'setup' && <SetupGuide />}
      </main>

      {/* Config Modal */}
      {configModalOpen && (
        <ConfigModal
          config={config}
          providers={DEFAULT_PROVIDERS}
          onSaveConfig={(updated) => setConfig(updated)}
          onClose={() => setConfigModalOpen(false)}
        />
      )}

      {/* Model Selector Modal */}
      {modelModalOpen && (
        <ModelSelectorModal
          activeProvider={activeProvider}
          activeModel={activeModel}
          providers={DEFAULT_PROVIDERS}
          onSelect={handleProviderChange}
          onClose={() => setModelModalOpen(false)}
        />
      )}

      {/* Diff Viewer Modal */}
      {diffModal && (
        <DiffViewerModal
          filePath={diffModal.filePath}
          originalContent={diffModal.originalContent}
          proposedContent={diffModal.proposedContent}
          onApply={() =>
            handleApplyFileChange(diffModal.filePath, diffModal.proposedContent)
          }
          onClose={() => setDiffModal(null)}
        />
      )}
    </div>
  );
}
