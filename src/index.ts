import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';
import { specs } from './utils/swagger';
import scrapeRoutes from './routes/scrapeRoutes';
import healthRoutes from './routes/healthRoutes';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 6969;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(requestLogger);
app.use(express.json());
app.use(defaultRateLimiter);

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    message: 'Request error',
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  res.status(500).json({
    status: 'error',
    message: err.message || 'An unexpected error occurred',
  });
};

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API Routes
app.use('/api/scrape', scrapeRoutes);
app.use('/health', healthRoutes);

// Apply error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  logger.info(`Model Context Protocol server running at http://localhost:${PORT}`);
});

export default app;
