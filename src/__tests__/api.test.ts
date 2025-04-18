import request from 'supertest';
import app from '../index';
import { scrapeUrl } from '../core/scraper';
import { authenticate } from '../middleware/authMiddleware'; // Import the middleware - Keep for type info if needed, but mock is removed

// Mock dependencies
jest.mock('../core/scraper');
// REMOVED global middleware mock

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/scrape', () => {
    test('should return scraped data for valid URL', async () => {
      const mockData = {
        url: 'https://example.com',
        title: 'Example Domain',
        content: 'Example content',
        metadata: { description: 'An example website' },
        timestamp: new Date().toISOString(),
      };

      // Mock scraper response
      (scrapeUrl as jest.Mock).mockResolvedValue(mockData);

      const response = await request(app).get('/api/scrape').query({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockData);
      expect(scrapeUrl).toHaveBeenCalledWith('https://example.com');
    });

    test('should return 400 for invalid URL', async () => {
      const response = await request(app).get('/api/scrape').query({ url: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(scrapeUrl).not.toHaveBeenCalled();
    });

    test('should return 500 for scraper errors', async () => {
      // Mock scraper error
      (scrapeUrl as jest.Mock).mockRejectedValue(new Error('Scraping failed'));

      const response = await request(app).get('/api/scrape').query({ url: 'https://example.com' });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });
  });
});
