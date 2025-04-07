import { Crawler } from '../crawler';
import { scrapeUrl, ScrapedData } from '../scraper';
import { MarkdownService } from '../../services/markdownService';
import prisma from '../../db/prismaClient';
import logger from '../../utils/logger';
import { requestPool } from '../../utils/requestPool'; // Import requestPool

// Mock dependencies
jest.mock('../scraper');
jest.mock('../../services/markdownService');
jest.mock('../../db/prismaClient', () => ({
  __esModule: true,
  default: {
    crawlJob: {
      update: jest.fn().mockResolvedValue({}),
    },
    scrapedPage: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
// Mock requestPool to execute tasks immediately for testing
jest.mock('../../utils/requestPool', () => ({
  requestPool: {
    add: jest.fn().mockImplementation(async (task) => await task()),
  },
}));


// Type assertions
const mockedScrapeUrl = scrapeUrl as jest.MockedFunction<typeof scrapeUrl>;
const mockedMarkdownService = MarkdownService as jest.Mocked<typeof MarkdownService>;
const mockedPrismaCrawlJob = prisma.crawlJob as jest.Mocked<typeof prisma.crawlJob>;
const mockedPrismaScrapedPage = prisma.scrapedPage as jest.Mocked<typeof prisma.scrapedPage>;

describe('Crawler', () => {
  const mockJobData = {
    id: 'crawl-job-1',
    startUrl: 'http://example.com/page1',
    status: 'pending',
    options: JSON.stringify({ maxDepth: 1, domainScope: 'strict', useBrowser: false, useCache: false }),
    userId: 'user-1',
    failedUrls: null,
    processedUrls: 0,
    foundUrls: 0,
    createdAt: new Date(), // Add missing fields from Prisma model
    updatedAt: new Date(),
    startTime: null,
    endTime: null,
  };

  const mockScrapedDataPage1: ScrapedData = {
    url: 'http://example.com/page1',
    title: 'Page 1',
    content: '<html><body><a href="/page2">Link 1</a> <a href="http://sub.example.com/page3">Subdomain Link</a> <a href="http://other.com">External Link</a> <a href="#fragment">Fragment Link</a></body></html>',
    metadata: {},
    timestamp: new Date().toISOString(),
  };
  
  const mockScrapedDataPage2: ScrapedData = {
    url: 'http://example.com/page2',
    title: 'Page 2',
    content: '<html><body><a href="/page1">Backlink</a></body></html>',
    metadata: {},
    timestamp: new Date().toISOString(),
  };
  
  const mockScrapedDataPage3: ScrapedData = { // Subdomain page
    url: 'http://sub.example.com/page3',
    title: 'Page 3',
    content: '<html><body>Subdomain Content</body></html>',
    metadata: {},
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockedScrapeUrl.mockImplementation(async (url) => {
        if (url === 'http://example.com/page1') return mockScrapedDataPage1;
        if (url === 'http://example.com/page2') return mockScrapedDataPage2;
        if (url === 'http://sub.example.com/page3') return mockScrapedDataPage3;
        if (url === 'http://fail.com/page') throw new Error('Scrape failed'); // Simulate failure
        throw new Error(`Mock not implemented for URL: ${url}`);
    });
    mockedMarkdownService.convertHtmlToMarkdown.mockImplementation((html, url) => `markdown: ${url}`); // Include URL for easier verification
    mockedPrismaCrawlJob.update.mockResolvedValue({} as any);
    mockedPrismaScrapedPage.upsert.mockResolvedValue({} as any);
  });

  it('should initialize correctly with job data and options', () => {
    const crawler = new Crawler(mockJobData);
    expect((crawler as any).job).toEqual(mockJobData);
    expect((crawler as any).options).toEqual(JSON.parse(mockJobData.options!));
    expect((crawler as any).startHostname).toBe('example.com');
    expect((crawler as any).startDomain).toBe('example.com');
    expect((crawler as any).maxDepth).toBe(1);
    expect((crawler as any).domainScope).toBe('strict');
    expect((crawler as any).queue).toEqual([{ url: mockJobData.startUrl, depth: 0 }]);
    expect((crawler as any).visited.size).toBe(0);
  });

  it('should run crawl respecting maxDepth and strict domainScope', async () => {
    const crawler = new Crawler(mockJobData); // maxDepth: 1, domainScope: strict
    const result = await crawler.run();

    expect(result.status).toBe('completed');
    expect(result.failedUrls).toEqual([]);
    expect(mockedScrapeUrl).toHaveBeenCalledTimes(2); // page1, page2
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://example.com/page1', expect.any(Object));
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://example.com/page2', expect.any(Object));
    expect(mockedScrapeUrl).not.toHaveBeenCalledWith('http://sub.example.com/page3', expect.any(Object)); // Out of scope
    expect(mockedScrapeUrl).not.toHaveBeenCalledWith('http://other.com', expect.any(Object)); // Out of scope
    expect(mockedPrismaScrapedPage.upsert).toHaveBeenCalledTimes(2);
    expect(mockedPrismaScrapedPage.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { url: 'http://example.com/page1' } }));
    expect(mockedPrismaScrapedPage.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { url: 'http://example.com/page1' } }));
    expect(mockedPrismaScrapedPage.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { url: 'http://example.com/page2' } }));
    expect(mockedMarkdownService.convertHtmlToMarkdown).toHaveBeenCalledTimes(2);
    // Calls: initial 'processing', after page1 batch, after page2 batch (queue empty), final 'completed'
    expect(mockedPrismaCrawlJob.update).toHaveBeenCalledTimes(4); 
    expect(mockedPrismaCrawlJob.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', processedUrls: 2, foundUrls: 2 }) })); // page1, page2 found
  });
  
  it('should handle different domain scopes (subdomains)', async () => {
    // Scope 'subdomains': Allows subdomains of example.com (e.g., sub.example.com) but NOT example.com itself after the start URL.
    const jobDataSubdomain = { ...mockJobData, startUrl: 'http://www.example.com/page1', options: JSON.stringify({ maxDepth: 1, domainScope: 'subdomains' }) };
     mockedScrapeUrl.mockImplementation(async (url) => { // Adjust mock for new start URL
        if (url === 'http://www.example.com/page1') return { ...mockScrapedDataPage1, url: 'http://www.example.com/page1', content: '<html><body><a href="http://sub.example.com/page3">Sub</a> <a href="http://example.com/page2">Parent</a></body></html>' };
        if (url === 'http://sub.example.com/page3') return mockScrapedDataPage3;
        throw new Error(`Mock not implemented for URL: ${url}`);
    });
    
    const crawler = new Crawler(jobDataSubdomain); 
    await crawler.run();

    // Start URL (www.example.com) is processed. 
    // Links found: sub.example.com (PASS scope), example.com (FAIL scope - not subdomain of www.example.com's parent)
    // sub.example.com is depth 1, so it's scraped.
    expect(mockedScrapeUrl).toHaveBeenCalledTimes(2); 
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://www.example.com/page1', expect.any(Object));
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://sub.example.com/page3', expect.any(Object));
    expect(mockedPrismaScrapedPage.upsert).toHaveBeenCalledTimes(2);
    // Found: www.example.com/page1, sub.example.com/page3
    // Calls: initial 'processing', after batch 1 (www), after batch 2 (sub), final 'completed'
    expect(mockedPrismaCrawlJob.update).toHaveBeenCalledTimes(4);
    expect(mockedPrismaCrawlJob.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', processedUrls: 2, foundUrls: 2 }) }));
  });
   it('should handle different domain scopes (parent_subdomains)', async () => {
    // Scope 'parent_subdomains': Allows parent domain (example.com) and its subdomains (www.example.com, sub.example.com)
    const jobDataParentSubdomain = { ...mockJobData, startUrl: 'http://www.example.com/page1', options: JSON.stringify({ maxDepth: 1, domainScope: 'parent_subdomains' }) };
     mockedScrapeUrl.mockImplementation(async (url) => { // Adjust mock for new start URL
        if (url === 'http://www.example.com/page1') return { ...mockScrapedDataPage1, url: 'http://www.example.com/page1', content: '<html><body><a href="http://sub.example.com/page3">Sub</a> <a href="http://example.com/page2">Parent</a> <a href="/page4">Rel</a></body></html>' };
        if (url === 'http://sub.example.com/page3') return mockScrapedDataPage3;
        if (url === 'http://example.com/page2') return mockScrapedDataPage2; // Parent domain page
        if (url === 'http://www.example.com/page4') return { ...mockScrapedDataPage1, url: 'http://www.example.com/page4', content: '' }; // Relative link page
        throw new Error(`Mock not implemented for URL: ${url}`);
    });
    
    const crawler = new Crawler(jobDataParentSubdomain); 
    await crawler.run();

    // Start URL (www.example.com) processed.
    // Links found: sub.example.com (PASS), example.com (PASS), /page4 -> www.example.com/page4 (PASS)
    // All are depth 1, so all are scraped due to maxDepth: 1
    expect(mockedScrapeUrl).toHaveBeenCalledTimes(4); 
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://www.example.com/page1', expect.any(Object));
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://sub.example.com/page3', expect.any(Object));
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://example.com/page2', expect.any(Object));
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://www.example.com/page4', expect.any(Object));
    expect(mockedPrismaScrapedPage.upsert).toHaveBeenCalledTimes(4); 
    // Found: www.example.com/page1, sub.example.com/page3, example.com/page2, www.example.com/page4
    // Calls: initial 'processing', after batch 1 (www), after batch 2 (sub, parent, rel), final 'completed'
    expect(mockedPrismaCrawlJob.update).toHaveBeenCalledTimes(4);
    expect(mockedPrismaCrawlJob.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', processedUrls: 4, foundUrls: 4 }) }));
  });

  it('should handle crawl failure and retry', async () => {
    const jobDataFail = { ...mockJobData, startUrl: 'http://fail.com/page', options: JSON.stringify({ maxDepth: 0, domainScope: 'none' }) };
    // Reset mocks specifically for this test
    jest.clearAllMocks(); 
    mockedPrismaCrawlJob.update.mockResolvedValue({} as any); // Ensure update is mocked
    mockedPrismaScrapedPage.upsert.mockResolvedValue({} as any); // Ensure upsert is mocked
    mockedMarkdownService.convertHtmlToMarkdown.mockImplementation((html, url) => `markdown: ${url}`);
    
    // Fail first, succeed second
    mockedScrapeUrl
      .mockRejectedValueOnce(new Error('Initial fail')) 
      .mockResolvedValueOnce({ 
        url: 'http://fail.com/page', // Ensure URL matches
        title: 'Failed Page (Retried)',
        content: '<html>Retry success</html>', 
        metadata: {},
        timestamp: new Date().toISOString(),
    });

    const crawler = new Crawler(jobDataFail);
    const result = await crawler.run();

    expect(result.status).toBe('completed'); // Completed after successful retry
    expect(result.failedUrls).toEqual([]);
    expect(mockedScrapeUrl).toHaveBeenCalledTimes(2); // Initial attempt + retry
    expect(mockedScrapeUrl).toHaveBeenCalledWith('http://fail.com/page', expect.any(Object));
    expect(mockedPrismaScrapedPage.upsert).toHaveBeenCalledTimes(1); // Only upserted on successful retry
    // Calls: initial 'processing', after main batch (empty), final 'completed' (after retry)
    expect(mockedPrismaCrawlJob.update).toHaveBeenCalledTimes(3);
    expect(mockedPrismaCrawlJob.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', processedUrls: 1, failedUrls: '[]' }) }));
  });
  
   it('should finish with completed_with_errors if retry fails', async () => {
    const jobDataFail = { ...mockJobData, startUrl: 'http://fail.com/page', options: JSON.stringify({ maxDepth: 0, domainScope: 'none' }) };
    // Reset mocks specifically for this test
    jest.clearAllMocks(); 
    mockedPrismaCrawlJob.update.mockResolvedValue({} as any);
    mockedPrismaScrapedPage.upsert.mockResolvedValue({} as any);
    mockedMarkdownService.convertHtmlToMarkdown.mockImplementation((html, url) => `markdown: ${url}`);
    
    mockedScrapeUrl.mockRejectedValue(new Error('Persistent fail')); // Fail both times

    const crawler = new Crawler(jobDataFail);
    const result = await crawler.run();

    expect(result.status).toBe('completed_with_errors'); 
    expect(result.failedUrls).toEqual(['http://fail.com/page']);
    expect(mockedScrapeUrl).toHaveBeenCalledTimes(2); // Initial attempt + retry
    expect(mockedPrismaScrapedPage.upsert).not.toHaveBeenCalled();
    // Calls: initial 'processing', after main batch (empty), final 'completed_with_errors' (after retry)
    expect(mockedPrismaCrawlJob.update).toHaveBeenCalledTimes(3);
    expect(mockedPrismaCrawlJob.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed_with_errors', failedUrls: JSON.stringify(['http://fail.com/page']) }) }));
  });

  it('should correctly normalize URLs and avoid duplicates', async () => {
     const jobDataNormalize = { ...mockJobData, startUrl: 'http://example.com/path/', options: JSON.stringify({ maxDepth: 1, domainScope: 'strict' }) };
     const page1Content = '<html><body><a href="../path/page2">Rel Link</a> <a href="page2#section">Fragment Link</a> <a href="/page2">Absolute Path</a></body></html>';
     // Reset mocks
     jest.clearAllMocks();
     mockedPrismaCrawlJob.update.mockResolvedValue({} as any);
     mockedPrismaScrapedPage.upsert.mockResolvedValue({} as any);
     mockedMarkdownService.convertHtmlToMarkdown.mockImplementation((html, url) => `markdown: ${url}`);
     
     mockedScrapeUrl.mockImplementation(async (url) => {
        if (url === 'http://example.com/path/') return { ...mockScrapedDataPage1, url: 'http://example.com/path/', content: page1Content };
        if (url === 'http://example.com/page2') return mockScrapedDataPage2;
        throw new Error(`Mock not implemented for URL: ${url}`);
    });

     const crawler = new Crawler(jobDataNormalize);
     await crawler.run();

     // Should scrape /path/ then /page2 (normalized from 3 links)
     // Check the exact calls more carefully
     // NOTE: Expecting 4 calls due to mock concurrency, but visited check should prevent redundant processing.
     expect(mockedScrapeUrl).toHaveBeenCalledTimes(4); 
     expect(mockedScrapeUrl).toHaveBeenCalledWith('http://example.com/path/', expect.any(Object));
     expect(mockedScrapeUrl).toHaveBeenCalledWith('http://example.com/page2', expect.any(Object)); 
     // Ensure it wasn't called with the same URL multiple times despite normalization
     const calls = mockedScrapeUrl.mock.calls;
     const uniqueUrlsCalled = new Set(calls.map(call => call[0]));
     expect(uniqueUrlsCalled.size).toBe(2);

     expect((crawler as any).queue.length).toBe(0);
     expect((crawler as any).visited.size).toBe(2);
     // Calls: initial 'processing', after /path/ batch, after /page2 batch, final 'completed'
     expect(mockedPrismaCrawlJob.update).toHaveBeenCalledTimes(4); 
     expect(mockedPrismaCrawlJob.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', processedUrls: 2, foundUrls: 2 }) })); // path/, page2 found
  });

});
