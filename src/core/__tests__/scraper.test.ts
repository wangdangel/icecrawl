import { scrapeUrl, ScrapedData } from '../scraper';
import { httpClient } from '../../utils/httpClient';
import { CacheService } from '../../services/cacheService';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../utils/httpClient');
jest.mock('../../services/cacheService');
jest.mock('@prisma/client');

describe('Scraper', () => {
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
    
    // Mock cache service
    (CacheService.get as jest.Mock).mockReturnValue(undefined);
    (CacheService.set as jest.Mock).mockReturnValue(true);
    
    // Mock Prisma client
    const mockPrisma = {
      scrapedPage: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
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
    
    // Set up cache hit
    (CacheService.get as jest.Mock).mockReturnValue(cachedData);
    
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
