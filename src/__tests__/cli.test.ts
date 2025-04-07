import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// Path to CLI entry point
const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js');

// Helper to run CLI commands
async function runCli(args: string = '', stdin: string = ''): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => { // Changed reject to resolve
    const child = exec(`node ${CLI_PATH} ${args}`, (error, stdout, stderr) => {
      // Always resolve, let the test check stderr and code
      resolve({ stdout, stderr, code: error?.code ?? 0 }); 
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
    // Place global options --format and --silent before the command 'url'
    const { stdout, stderr, code } = await runCli('--format json --silent url https://example.com');

    // Check for errors first - Now stderr should be empty because of --silent
    expect(stderr).toBe(''); // Expect nothing on stderr for clean JSON output
    expect(code).toBe(0);    // Expect success exit code

    // Now parse stdout
    const result = JSON.parse(stdout); // This should now only parse actual stdout
    expect(result).toHaveProperty('url', 'https://example.com');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
  });
  
  test('should handle invalid URLs', async () => {
    // Destructure code here as well
    const { stderr, code } = await runCli('url invalid-url'); 
    
    expect(stderr).toContain('Error:'); // Expect error message on stderr
    expect(code).not.toBe(0); // Expect non-zero exit code
  });
});
