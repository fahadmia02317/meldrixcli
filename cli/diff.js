import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

/**
 * Extracts proposed file modifications from AI response
 * @param {string} text 
 * @returns {Array<{path: string, newContent: string}>}
 */
export function extractFileModifications(text) {
  const modifications = [];

  // Pattern 1: <<<FILE: filepath>>> ... <<<END_FILE>>>
  const delimiterRegex = /<<<FILE:\s*([^\n\r>]+)>>>([\s\S]*?)<<<END_FILE>>>/g;
  let match;
  while ((match = delimiterRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    let content = match[2];
    // Trim leading/trailing single newline
    if (content.startsWith('\n')) content = content.slice(1);
    if (content.endsWith('\n')) content = content.slice(0, -1);
    modifications.push({ path: filePath, newContent: content });
  }

  // Pattern 2: Markdown block with file path comment: ```ts // file: path/to/file.ts or ```typescript:path/to/file.ts
  if (modifications.length === 0) {
    const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?(?:\s*[:#\/]\s*([^\n\r]+)|\s*\n\/\/\s*(?:file:)?\s*([^\n\r]+))\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const filePath = (match[1] || match[2] || '').trim();
      const content = match[3];
      if (filePath && (filePath.includes('.') || filePath.includes('/'))) {
        modifications.push({ path: filePath, newContent: content });
      }
    }
  }

  return modifications;
}

/**
 * Computes a clean line-by-line unified diff between old content and new content
 * @param {string} oldText 
 * @param {string} newText 
 * @returns {{ diffLines: Array<{type: 'add'|'del'|'same', text: string}>, additions: number, deletions: number }}
 */
export function computeDiff(oldText, newText) {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  // Simple Longest Common Subsequence or Myers-like line diff for clean CLI display
  const diffLines = [];
  let additions = 0;
  let deletions = 0;

  // Simple dynamic programming LCS table
  const n = oldLines.length;
  const m = newLines.length;

  if (n === 0) {
    for (const line of newLines) {
      diffLines.push({ type: 'add', text: line });
      additions++;
    }
    return { diffLines, additions, deletions };
  }

  // To prevent huge matrices on very large files, limit DP if lines > 1500
  if (n > 1500 || m > 1500) {
    // Fallback block comparison
    return {
      diffLines: [
        ...oldLines.map(l => ({ type: 'del', text: l })),
        ...newLines.map(l => ({ type: 'add', text: l }))
      ],
      additions: m,
      deletions: n
    };
  }

  // LCS Matrix
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff
  let i = n, j = m;
  const reverseDiff = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reverseDiff.push({ type: 'same', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reverseDiff.push({ type: 'add', text: newLines[j - 1] });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      reverseDiff.push({ type: 'del', text: oldLines[i - 1] });
      deletions++;
      i--;
    }
  }

  reverseDiff.reverse();
  return { diffLines: reverseDiff, additions, deletions };
}

/**
 * Formats a colorful terminal diff string
 * @param {string} filePath 
 * @param {Array<{type: 'add'|'del'|'same', text: string}>} diffLines 
 * @param {number} additions 
 * @param {number} deletions 
 * @returns {string}
 */
export function formatTerminalDiff(filePath, diffLines, additions, deletions) {
  const header = [
    chalk.bold.cyan(`\n╭─── Proposed Changes: ${chalk.yellow(filePath)} ─────────────`),
    chalk.dim(`│ +${additions} lines, -${deletions} lines`),
    chalk.cyan(`├───────────────────────────────────────────────`)
  ].join('\n');

  const visibleLines = [];
  // Only display relevant context around diffs (3 lines before and after)
  let skipMode = false;

  for (let idx = 0; idx < diffLines.length; idx++) {
    const line = diffLines[idx];
    if (line.type === 'add') {
      visibleLines.push(chalk.green(`+ ${line.text}`));
      skipMode = false;
    } else if (line.type === 'del') {
      visibleLines.push(chalk.red(`- ${line.text}`));
      skipMode = false;
    } else {
      // Check if near a diff
      const isNearDiff = diffLines.slice(Math.max(0, idx - 3), Math.min(diffLines.length, idx + 4))
        .some(l => l.type !== 'same');
      if (isNearDiff) {
        visibleLines.push(chalk.dim(`  ${line.text}`));
        skipMode = false;
      } else if (!skipMode) {
        visibleLines.push(chalk.dim('  ...'));
        skipMode = true;
      }
    }
  }

  const footer = chalk.cyan(`╰───────────────────────────────────────────────`);
  return `${header}\n${visibleLines.join('\n')}\n${footer}`;
}

/**
 * Safely applies a file write to the filesystem
 * @param {string} baseDir 
 * @param {string} relPath 
 * @param {string} newContent 
 */
export async function applyFileChange(baseDir, relPath, newContent) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.resolve(baseDir, relPath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, newContent, 'utf8');
}
