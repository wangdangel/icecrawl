import { scrapeUrl, ScrapedData } from '../scraper';
import { httpClient } from '../../utils/httpClient';
import { CacheService } from '../../services/cacheService';
import { PrismaClient } from '@prisma/client'; // Keep only one import

// Mock dependencies
jest.mock('../../utils/httpClient');
jest.mock('../../services/cacheService');
// Mock the shared prisma instance from ../../db/prismaClient (Corrected Path)
// Define mockUpsert *inside* the factory function to avoid hoisting issues
jest.mock('../../db/prismaClient', () => {
  const mockUpsert = jest.fn().mockResolvedValue({});
  return {
    __esModule: true, // This is important for ES modules
    default: { // Mock the default export
      scrapedPage: {
        upsert: mockUpsert,
      },
      // Add mocks for other models/methods if needed by scraper.ts
    },
    // Export the mock function itself if needed for resetting in tests
    _mockUpsert: mockUpsert
  }; // Corrected: Removed extra comma and brace/semicolon
});


describe('Scraper', () => {
  // Import the mock function for resetting if needed (optional)
  // const { _mockUpsert } = jest.requireMock('../../db/prismaClient');
  // Sample HTML for testing
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
        <meta name="description" content="Test description">
        <meta property="og:title" content="Test OG Title">
      </head>
      <body>
        <main>
          <h1>Main Content</h1>
          <p>This is the main content of the page.</p>
          <a href="https://example.com">Example Link</a>
        </main>
        <footer>
          Footer content
        </footer>
      </body>
    </html>
  `;
  
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
    
    // Mock HTTP client
    (httpClient.get as jest.Mock).mockResolvedValue({
      data: sampleHtml,
      status: 200,
      headers: {},
    });
    
    // Mock cache service - Explicitly assign jest.fn()
    CacheService.get = jest.fn().mockReturnValue(undefined);
    CacheService.set = jest.fn().mockReturnValue(true);

    // Reset the prisma mock function before each test
    // Need to access the mock function exported from the mock module
    const { _mockUpsert } = jest.requireMock('../../db/prismaClient');
    _mockUpsert.mockClear();
    // No need to mock PrismaClient constructor anymore
  });

  test('should scrape a URL successfully', async () => {
    const url = 'https://test.com';
    
    const result = await scrapeUrl(url, { useCache: false });
    
    // Verify the result structure
    expect(result).toBeDefined();
    expect(result.url).toBe(url);
    expect(result.title).toBe('Test Page');
    expect(result.content).toContain('Main Content');
    expect(result.content).toContain('This is the main content of the page.');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.description).toBe('Test description');
    expect(result.metadata.og_title).toBe('Test OG Title');
    
    // Verify HTTP client was called
    expect(httpClient.get).toHaveBeenCalledWith(url);
  });
  
  test('should use cache when available', async () => {
    const url = 'https://test.com';
    const cachedData: ScrapedData = {
      url,
      title: 'Cached Title',
      content: 'Cached content',
      metadata: {},
      timestamp: new Date().toISOString(),
    };
    
    // Set up cache hit - Explicitly assign jest.fn()
    CacheService.get = jest.fn().mockReturnValue(cachedData);
    
    const result = await scrapeUrl(url, { useCache: true });
    
    // Verify we got the cached data
    expect(result).toEqual(cachedData);
    
    // Verify HTTP client was NOT called
    expect(httpClient.get).not.toHaveBeenCalled();
  });
  
  test('should handle HTTP errors', async () => {
    const url = 'https://test.com';
    
    // Set up HTTP error
    (httpClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    await expect(scrapeUrl(url)).rejects.toThrow('Failed to scrape URL');
  });
});
