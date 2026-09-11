import { WorkspaceFile } from './types';

export const INITIAL_WORKSPACE_FILES: WorkspaceFile[] = [
  {
    path: 'src/calculator.ts',
    language: 'typescript',
    inContext: true,
    lines: 28,
    tokens: 145,
    content: `export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error("Division by zero");
    }
    return a / b;
  }

  // TODO: Add exponential power, square root, and modulo functions
}
`
  },
  {
    path: 'src/auth.ts',
    language: 'typescript',
    inContext: false,
    lines: 34,
    tokens: 190,
    content: `import crypto from 'node:crypto';

export interface UserSession {
  userId: string;
  role: 'admin' | 'user' | 'guest';
  expiresAt: number;
}

export class AuthService {
  private sessions = new Map<string, UserSession>();

  createSession(userId: string, role: 'admin' | 'user' | 'guest'): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
    this.sessions.set(token, { userId, role, expiresAt });
    return token;
  }

  validateSession(token: string): UserSession | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  revoke(token: string): boolean {
    return this.sessions.delete(token);
  }
}
`
  },
  {
    path: 'tests/calculator.test.ts',
    language: 'typescript',
    inContext: false,
    lines: 22,
    tokens: 110,
    content: `import { describe, it, expect } from 'vitest';
import { Calculator } from '../src/calculator';

describe('Calculator', () => {
  const calc = new Calculator();

  it('adds two numbers', () => {
    expect(calc.add(2, 3)).toBe(5);
  });

  it('handles division by zero gracefully', () => {
    expect(() => calc.divide(10, 0)).toThrow('Division by zero');
  });
});
`
  },
  {
    path: 'package.json',
    language: 'json',
    inContext: false,
    lines: 18,
    tokens: 85,
    content: `{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "build": "tsc"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
`
  }
];
