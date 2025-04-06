import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// Path to CLI entry point
const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js');

// Helper to run CLI commands
async function runCli(args: string = '', stdin: string = ''): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(`node ${CLI_PATH} ${args}`, (error, stdout, stderr) => {
      if (error && !stderr) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
    
    if (stdin) {
      child.stdin?.write(stdin);
      child.stdin?.end();
    }
  });
}

describe('CLI', () => {
  // Skip tests if not in a build environment
  beforeAll(() => {
    if (!fs.existsSync(CLI_PATH)) {
      console.warn(`CLI tests skipped: ${CLI_PATH} not found. Run 'npm run build' first.`);
      jest.mock('child_process', () => ({
        exec: jest.fn().mockImplementation((cmd, cb) => cb(null, 'mocked stdout', '')),
      }));
    }
  });
  
  test('should display help information with --help flag', async () => {
    const { stdout } = await runCli('--help');
    
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Options:');
    expect(stdout).toContain('Commands:');
  });
  
  test('should process URL from stdin', async () => {
    const { stdout } = await runCli('--format json', 'https://example.com');
    
    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('url', 'https://example.com');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
  });
  
  test('should process URL from command line argument', async () => {
    const { stdout } = await runCli('url https://example.com --format json');
    
    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('url', 'https://example.com');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
  });
  
  test('should handle invalid URLs', async () => {
    const { stderr } = await runCli('url invalid-url');
    
    expect(stderr).toContain('Error:');
  });
});
