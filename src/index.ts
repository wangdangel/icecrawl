import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import session from 'express-session';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { authenticate } from './middleware/authMiddleware';
import logger from './utils/logger';
import { specs } from './utils/swagger';

// Route imports
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import scrapeRoutes from './routes/scrapeRoutes';
import exportRoutes from './routes/exportRoutes';
import transformRoutes from './routes/transformRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import healthRoutes from './routes/healthRoutes';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 6969;
const isProduction = process.env.NODE_ENV === 'production';

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'webscraper-session-secret-dev-only';

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdnjs.cloudflare.com'], // Allow scripts from CDNs for dashboard
      styleSrc: ["'self'", 'cdnjs.cloudflare.com', "'unsafe-inline'"], // Allow styles from CDNs
      fontSrc: ["'self'", 'cdnjs.cloudflare.com'], // Allow fonts from CDNs
      imgSrc: ["'self'", 'data:'], // Allow inline data images
      connectSrc: ["'self'"],
    },
  },
}));
app.use(morgan('dev'));
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(defaultRateLimiter);

// Session middleware
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scrape', authenticate, scrapeRoutes);
app.use('/api/transform', authenticate, transformRoutes);
app.use('/api/export', authenticate, exportRoutes);
app.use('/dashboard', dashboardRoutes); // Dashboard routes (includes UI and API)
app.use('/health', healthRoutes);

// Default route for SPA support
app.get('/', (req: Request, res: Response) => {
  res.redirect('/dashboard');
});

// Catch-all route for SPA
app.get('*', (req: Request, res: Response) => {
  // Check if request is for API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ status: 'error', message: 'API endpoint not found' });
  }
  
  // For non-API routes, redirect to dashboard
  res.redirect('/dashboard');
});

// Apply error handler
app.use(errorHandler);

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Web Scraper server running at http://localhost:${PORT}`);
    logger.info(`Dashboard UI available at http://localhost:${PORT}/dashboard`);
    logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
  });
}

export default app;
