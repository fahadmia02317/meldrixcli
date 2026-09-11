import fs from 'node:fs';
import path from 'node:path';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.idea',
  '.vscode'
]);

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.wasm',
  '.exe',
  '.bin',
  '.lock',
  '.lockb',
  '.pyc'
]);

export class ContextManager {
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
    /** @type {Map<string, { content: string, lines: number, size: number, tokens: number }>} */
    this.files = new Map();
  }

  /**
   * Adds a file or directory recursively
   * @param {string} targetPath Relative or absolute path
   * @returns {{ added: string[], skipped: string[], errors: string[] }}
   */
  addPath(targetPath) {
    const resolvedPath = path.isAbsolute(targetPath)
      ? targetPath
      : path.resolve(this.baseDir, targetPath);

    const result = { added: [], skipped: [], errors: [] };

    if (!fs.existsSync(resolvedPath)) {
      result.errors.push(`Path does not exist: ${targetPath}`);
      return result;
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      this._scanDirectory(resolvedPath, result);
    } else if (stat.isFile()) {
      this._addSingleFile(resolvedPath, result);
    }

    return result;
  }

  _scanDirectory(dirPath, result) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        result.skipped.push(path.relative(this.baseDir, path.join(dirPath, entry.name)));
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        this._scanDirectory(fullPath, result);
      } else if (entry.isFile()) {
        this._addSingleFile(fullPath, result);
      }
    }
  }

  _addSingleFile(filePath, result) {
    const ext = path.extname(filePath).toLowerCase();
    const relPath = path.relative(this.baseDir, filePath);

    if (IGNORED_EXTENSIONS.has(ext)) {
      result.skipped.push(relPath);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Simple binary check: look for null bytes
      if (content.includes('\0')) {
        result.skipped.push(`${relPath} (binary)`);
        return;
      }

      const lines = content.split('\n').length;
      const size = Buffer.byteLength(content, 'utf8');
      const tokens = Math.ceil(content.length / 3.8); // Reasonable heuristic

      this.files.set(relPath, { content, lines, size, tokens });
      result.added.push(relPath);
    } catch (err) {
      result.errors.push(`Failed reading ${relPath}: ${err.message}`);
    }
  }

  /**
   * Drops a file or matches from context
   * @param {string} targetPath 
   */
  dropPath(targetPath) {
    const rel = path.relative(this.baseDir, path.resolve(this.baseDir, targetPath));
    if (this.files.has(rel)) {
      this.files.delete(rel);
      return [rel];
    }

    // Try prefix match
    const dropped = [];
    for (const key of this.files.keys()) {
      if (key === targetPath || key.startsWith(targetPath)) {
        this.files.delete(key);
        dropped.push(key);
      }
    }
    return dropped;
  }

  clear() {
    const count = this.files.size;
    this.files.clear();
    return count;
  }

  listFiles() {
    const list = [];
    let totalTokens = 0;
    let totalLines = 0;

    for (const [relPath, info] of this.files.entries()) {
      list.push({
        path: relPath,
        lines: info.lines,
        size: info.size,
        tokens: info.tokens
      });
      totalTokens += info.tokens;
      totalLines += info.lines;
    }

    return {
      files: list,
      totalFiles: list.length,
      totalLines,
      totalTokens
    };
  }

  /**
   * Generates formatted context block for LLM prompt
   */
  getSystemContext() {
    if (this.files.size === 0) {
      return '';
    }

    const sections = [
      '### ACTIVE FILES IN CONTEXT (Current Workspace):',
      'Here are the files the user has loaded into context for you to inspect and modify:'
    ];

    for (const [relPath, info] of this.files.entries()) {
      sections.push(
        `--- FILE: ${relPath} (${info.lines} lines, ~${info.tokens} tokens) ---`,
        '```',
        info.content,
        '```',
        ''
      );
    }

    sections.push(
      'When modifying or creating files, output your modifications using the following unambiguous format:',
      '<<<FILE: path/to/file.ext>>>',
      '[Full contents of the file or replacement]',
      '<<<END_FILE>>>',
      'You may also output standard Unified Diff blocks if appropriate.'
    );

    return sections.join('\n');
  }
}
