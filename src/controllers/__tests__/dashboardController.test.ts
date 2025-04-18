import { Request, Response } from 'express';
import { DashboardController } from '../dashboardController';
// Import service and necessary types
import {
  DashboardService,
  RecentScrapeOutput,
  TagOutput,
  CrawlJobSummary,
} from '../../services/dashboardService';
import { ScrapeJob } from '@prisma/client'; // Import Prisma type
import logger from '../../utils/logger';

// Mock services and logger
jest.mock('../../services/dashboardService');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock Express Request and Response objects
const mockRequest = (
  query: any = {},
  params: any = {},
  body: any = {},
  user: any = null,
): Partial<Request> => ({
  query,
  params,
  body,
  user, // For authenticated routes
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res); // Mock setHeader for statistics test
  return res;
};

// Type assertions for mocked services
const mockedDashboardService = DashboardService as jest.Mocked<typeof DashboardService>;

describe('DashboardController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const mockUser = { id: 'user-1' }; // Simulate authenticated user
  const mockDate = new Date();

  // Define mock data matching the service output types (Moved outside describe block)
  const mockRecentScrape: RecentScrapeOutput = {
    id: 'scrape-1',
    url: 'http://example.com',
    title: 'Example',
    createdAt: mockDate,
    isFavorite: false,
    category: 'Test',
    viewCount: 0,
    lastViewed: null,
    tags: [{ id: 'tag-1', name: 'ExampleTag', color: '#ffffff' }],
  };
  const mockStats = {
    // Matches the return type of getStatistics
    totalScrapes: 10,
    totalFavorites: 2,
    scrapesByDay: [{ date: '2023-01-01', count: 5 }],
    topDomains: [{ domain: 'example.com', count: 8 }],
    scrapeJobStats: { pending: 1, failed: 0 },
    crawlJobStats: { pending: 0, failed: 1 },
  };
  const mockTags: TagOutput[] = [
    // Matches TagOutput type
    { id: 'tag-1', name: 'News', color: '#ff0000' },
    { id: 'tag-2', name: 'Tech', color: '#0000ff' },
  ];
  // Use the actual Prisma ScrapeJob type for the mock
  const mockScrapeJob: ScrapeJob = {
    id: 'job-1',
    url: 'http://example.com',
    status: 'failed',
    createdAt: mockDate,
    updatedAt: mockDate,
    startTime: null,
    endTime: null,
    userId: mockUser.id,
    resultId: null,
    options: null,
    error: null,
    // retryCount: 0, // Removed retryCount as it's not in the Prisma model
    scheduledFor: null, // Added missing fields from ScrapeJob type
    isRecurring: false,
    schedule: null,
  };
  const mockCrawlJob: CrawlJobSummary = {
    // Matches CrawlJobSummary type
    id: 'crawl-1',
    startUrl: 'http://example.com',
    status: 'completed',
    createdAt: mockDate,
    startTime: mockDate,
    endTime: mockDate,
    processedUrls: 10,
    foundUrls: 50,
  };

  // Removed the duplicate describe block start and redeclarations correctly this time.
  // The main describe block starts above where mock data is defined.

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse(); // Create a fresh response mock for each test
  });

  // --- getRecentScrapes ---
  describe('getRecentScrapes', () => {
    it('should return recent scrapes with pagination', async () => {
      req = mockRequest({ page: '1', limit: '5' }, {}, {}, mockUser);
      // Use correctly typed mock data
      const serviceResult = { scrapes: [mockRecentScrape], total: 1 };
      mockedDashboardService.getRecentScrapes.mockResolvedValue(serviceResult);

      await DashboardController.getRecentScrapes(req as Request, res as Response);

      expect(mockedDashboardService.getRecentScrapes).toHaveBeenCalledWith(mockUser.id, {
        page: 1,
        limit: 5,
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scrapes: serviceResult.scrapes,
          pagination: {
            page: 1,
            limit: 5,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    });

    it('should return 400 for invalid pagination params', async () => {
      req = mockRequest({ page: 'invalid', limit: '-5' }, {}, {}, mockUser);
      await DashboardController.getRecentScrapes(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid pagination parameters' }),
      );
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.getRecentScrapes.mockRejectedValue(error);

      await DashboardController.getRecentScrapes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while getting recent scrapes',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error getting recent scrapes in controller' }),
      );
    });
  });

  // --- getAllScrapes ---
  describe('getAllScrapes', () => {
    it('should return all scrapes with pagination and filters', async () => {
      req = mockRequest(
        { page: '2', limit: '10', search: 'test', category: 'news' },
        {},
        {},
        mockUser,
      );
      // Use correctly typed mock data
      const serviceResult = { scrapes: [mockRecentScrape], total: 11 };
      mockedDashboardService.getAllScrapes.mockResolvedValue(serviceResult);

      await DashboardController.getAllScrapes(req as Request, res as Response);

      expect(mockedDashboardService.getAllScrapes).toHaveBeenCalledWith(
        mockUser.id,
        { page: 2, limit: 10 },
        { search: 'test', category: 'news', tag: undefined },
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scrapes: serviceResult.scrapes,
          pagination: {
            page: 2,
            limit: 10,
            total: 11,
            totalPages: 2, // ceil(11/10)
            hasNextPage: false,
            hasPrevPage: true,
          },
        },
      });
    });

    it('should return 400 for invalid query params', async () => {
      req = mockRequest({ limit: 'invalid' }, {}, {}, mockUser);
      await DashboardController.getAllScrapes(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid query parameters' }),
      );
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.getAllScrapes.mockRejectedValue(error);

      await DashboardController.getAllScrapes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while getting scrapes',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error getting all scrapes in controller' }),
      );
    });
  });

  // --- getStatistics ---
  describe('getStatistics', () => {
    // Use correctly typed mock data
    // const mockStats = { totalScrapes: 10, avgScrapeTime: 1.5, failedJobs: 1 }; // Old incorrect mock

    it('should return statistics for default date range', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      // Use correctly typed mock data
      mockedDashboardService.getStatistics.mockResolvedValue(mockStats);

      await DashboardController.getStatistics(req as Request, res as Response);

      expect(mockedDashboardService.getStatistics).toHaveBeenCalledWith(
        mockUser.id,
        { start: expect.any(Date), end: expect.any(Date) }, // Check that dates are passed
      );
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            ...mockStats,
            dateRange: { start: expect.any(String), end: expect.any(String) },
          }),
        }),
      );
    });

    it('should return statistics for specified date range', async () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-01-31T23:59:59.999Z';
      req = mockRequest({ startDate, endDate }, {}, {}, mockUser);
      // Use correctly typed mock data
      mockedDashboardService.getStatistics.mockResolvedValue(mockStats);

      await DashboardController.getStatistics(req as Request, res as Response);

      // Check if the service was called with Date objects corresponding to start/end of day UTC
      expect(mockedDashboardService.getStatistics).toHaveBeenCalledWith(mockUser.id, {
        start: new Date('2023-01-01T00:00:00.000Z'),
        end: new Date('2023-01-31T23:59:59.999Z'),
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateRange: { start: '2023-01-01T00:00:00.000Z', end: '2023-01-31T23:59:59.999Z' },
          }),
        }),
      );
    });

    it('should return 400 for invalid date range params', async () => {
      req = mockRequest({ startDate: 'invalid-date' }, {}, {}, mockUser);
      await DashboardController.getStatistics(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid date range parameters' }),
      );
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.getStatistics.mockRejectedValue(error);

      await DashboardController.getStatistics(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while getting dashboard statistics',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error getting dashboard statistics in controller' }),
      );
    });
  });

  // --- getTags ---
  describe('getTags', () => {
    it('should return list of tags', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      // Use correctly typed mock data
      mockedDashboardService.getTags.mockResolvedValue(mockTags);

      await DashboardController.getTags(req as Request, res as Response);

      expect(mockedDashboardService.getTags).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { tags: mockTags },
      });
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.getTags.mockRejectedValue(error);

      await DashboardController.getTags(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while getting tags',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error getting tags in controller' }),
      );
    });
  });

  // --- getScrapeJobs ---
  describe('getScrapeJobs', () => {
    it('should return scrape jobs with pagination and filters', async () => {
      req = mockRequest({ page: '1', limit: '10', status: 'failed' }, {}, {}, mockUser);
      // Use correctly typed mock data
      const serviceResult = { jobs: [mockScrapeJob], total: 1 };
      mockedDashboardService.getScrapeJobs.mockResolvedValue(serviceResult);

      await DashboardController.getScrapeJobs(req as Request, res as Response);

      expect(mockedDashboardService.getScrapeJobs).toHaveBeenCalledWith(
        mockUser.id,
        { page: 1, limit: 10 },
        { status: 'failed' },
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          jobs: serviceResult.jobs,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    });

    it('should return 400 for invalid query params', async () => {
      req = mockRequest({ status: 'invalid-status' }, {}, {}, mockUser);
      await DashboardController.getScrapeJobs(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid query parameters' }),
      );
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.getScrapeJobs.mockRejectedValue(error);

      await DashboardController.getScrapeJobs(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while getting scrape jobs',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error getting scrape jobs in controller' }),
      );
    });
  });

  // --- retryScrapeJob ---
  describe('retryScrapeJob', () => {
    const jobId = 'job-to-retry';

    it('should retry job successfully', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      mockedDashboardService.retryScrapeJob.mockResolvedValue({
        success: true,
        message: 'Job resubmitted',
      });

      await DashboardController.retryScrapeJob(req as Request, res as Response);

      expect(mockedDashboardService.retryScrapeJob).toHaveBeenCalledWith(jobId, mockUser.id);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'Job resubmitted' });
    });

    it('should return 404 if job not found', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      mockedDashboardService.retryScrapeJob.mockResolvedValue({
        success: false,
        message: 'Job not found',
      });

      await DashboardController.retryScrapeJob(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Job not found' });
    });

    it('should return 400 if job cannot be retried', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      mockedDashboardService.retryScrapeJob.mockResolvedValue({
        success: false,
        message: 'Job not in failed state',
      });

      await DashboardController.retryScrapeJob(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Job not in failed state',
      });
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.retryScrapeJob.mockRejectedValue(error);

      await DashboardController.retryScrapeJob(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while retrying the scrape job',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error retrying scrape job in controller' }),
      );
    });
  });

  // --- deleteScrapeJob ---
  describe('deleteScrapeJob', () => {
    const jobId = 'job-to-delete';

    it('should delete job successfully', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      mockedDashboardService.deleteScrapeJob.mockResolvedValue({
        success: true,
        message: 'Job deleted',
      });

      await DashboardController.deleteScrapeJob(req as Request, res as Response);

      expect(mockedDashboardService.deleteScrapeJob).toHaveBeenCalledWith(jobId, mockUser.id);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'Job deleted' });
    });

    it('should return 404 if job not found', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      mockedDashboardService.deleteScrapeJob.mockResolvedValue({
        success: false,
        message: 'Job not found',
      });

      await DashboardController.deleteScrapeJob(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Job not found' });
    });

    it('should return 500 if service fails to delete', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      mockedDashboardService.deleteScrapeJob.mockResolvedValue({
        success: false,
        message: 'Deletion failed',
      });

      await DashboardController.deleteScrapeJob(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500); // Or appropriate code based on service failure reason
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Deletion failed' });
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, { id: jobId }, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.deleteScrapeJob.mockRejectedValue(error);

      await DashboardController.deleteScrapeJob(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An unexpected error occurred while deleting the scrape job',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error deleting scrape job in controller' }),
      );
    });
  });

  // --- getCrawlJobs ---
  describe('getCrawlJobs', () => {
    it('should return crawl jobs with pagination and filters', async () => {
      req = mockRequest({ page: '1', limit: '10', status: 'completed' }, {}, {}, mockUser);
      // Use correctly typed mock data
      const serviceResult = { jobs: [mockCrawlJob], total: 1 };
      mockedDashboardService.getCrawlJobs.mockResolvedValue(serviceResult);

      await DashboardController.getCrawlJobs(req as Request, res as Response);

      expect(mockedDashboardService.getCrawlJobs).toHaveBeenCalledWith(
        mockUser.id,
        { page: 1, limit: 10 },
        { status: 'completed' },
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          jobs: serviceResult.jobs,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    });

    it('should return 400 for invalid query params', async () => {
      req = mockRequest({ status: 'invalid-status' }, {}, {}, mockUser);
      await DashboardController.getCrawlJobs(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid query parameters' }),
      );
    });

    it('should return 500 if service throws an error', async () => {
      req = mockRequest({}, {}, {}, mockUser);
      const error = new Error('DB Error');
      mockedDashboardService.getCrawlJobs.mockRejectedValue(error);

      await DashboardController.getCrawlJobs(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while fetching crawl jobs',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error getting crawl jobs for dashboard' }),
      );
    });
  });
});
