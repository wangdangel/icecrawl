/**
 * Reads input from stdin until EOF
 * 
 * @returns Promise resolving to the stdin input as a string
 */
export function getInputFromStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    
    // Handle input data
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    // Resolve when input ends
    process.stdin.on('end', () => {
      resolve(data);
    });
    
    // Handle errors
    process.stdin.on('error', (error) => {
      console.error('Error reading from stdin:', error);
      resolve('');
    });
    
    // Set encoding
    process.stdin.setEncoding('utf8');
    
    // Resume stdin if it's paused
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }
  });
}
