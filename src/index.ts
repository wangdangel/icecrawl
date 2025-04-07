import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import session from 'express-session';
import { defaultRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { authenticate as realAuthenticate } from './middleware/authMiddleware'; // Rename original
import logger from './utils/logger';
import { specs } from './utils/swagger';

// Route imports
import { router as authRoutes } from './routes/authRoutes'; // Update to named import
import userRoutes from './routes/user-routes';
import scrapeRoutes from './routes/scrapeRoutes';
import exportRoutes from './routes/exportRoutes';
import transformRoutes from './routes/transformRoutes';
import dashboardRoutes from './routes/dashboard-routes';
import healthRoutes from './routes/healthRoutes';
import viewScrapeRoutes from './routes/viewScrapeRoutes';
import crawlRoutes from './routes/crawlRoutes'; // Import crawl routes
import { startWorker } from './core/worker'; // Import the worker starter function

// Initialize express app
const app = express();
const PORT = process.env.PORT || 6971; // Changed default port to 6971
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Conditional Authentication Middleware
const authenticate = isTest ? (req: Request, res: Response, next: NextFunction) => next() : realAuthenticate;

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'webscraper-session-secret-dev-only';

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdnjs.cloudflare.com', "'unsafe-inline'"], // Allow inline scripts for login page
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
// REMOVED: Global rate limiter
// app.use(defaultRateLimiter);

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

// Serve static files relative to the script's directory (__dirname)
// This ensures it works correctly when run globally
const publicPath = path.join(__dirname, '../public');
// Serve static assets (CSS, JS, images) from the public directory
app.use(express.static(publicPath)); 

// Explicitly serve dashboard index.html for /dashboard and /dashboard/ routes
app.get('/dashboard(/)?', (req: Request, res: Response, next: NextFunction) => {
  const dashboardIndexPath = path.join(publicPath, 'dashboard', 'index.html');
  
  // --- DIAGNOSTIC LOGGING ---
  logger.info(`Dashboard route hit. Trying to serve: ${dashboardIndexPath}`);
  try {
    const fileExists = require('fs').existsSync(dashboardIndexPath);
    logger.info(`Does dashboard index file exist at path? ${fileExists}`);
    if (!fileExists) {
       logger.error(`Dashboard index.html NOT FOUND at calculated path: ${dashboardIndexPath}`);
       // Optionally list directory contents for debugging
       try {
         const parentDirContents = require('fs').readdirSync(path.dirname(dashboardIndexPath));
         logger.info(`Contents of ${path.dirname(dashboardIndexPath)}: ${parentDirContents.join(', ')}`);
         const publicDirContents = require('fs').readdirSync(publicPath);
         logger.info(`Contents of ${publicPath}: ${publicDirContents.join(', ')}`);
       } catch (readErr: any) {
         logger.warn(`Could not read directory contents for debugging: ${readErr.message}`);
       }
    }
  } catch (e: any) {
      logger.error(`Error checking file existence: ${e.message}`);
  }
  // --- END DIAGNOSTIC LOGGING ---

  res.sendFile(dashboardIndexPath, (err) => {
    if (err) {
      // If file not found or other error, pass to next error handler
      // Log error was already added, keep it
      logger.error(`Error sending dashboard index.html: ${err.message}`); 
      // Ensure 404 is sent if file specifically not found, otherwise let default error handler run
      if (err.message.includes('ENOENT')) { // ENOENT: Error NO ENTry (file not found)
         res.status(404).send('Dashboard file not found.');
      } else {
         next(err); 
      }
    } else {
       logger.info(`Successfully sent: ${dashboardIndexPath}`);
    }
  });
});

// REMOVED: Explicit redirect for /dashboard
/*
app.get('/dashboard', (req: Request, res: Response) => {
  res.redirect('/dashboard/');
});
*/

// REMOVED: General static file serving (Re-added above)
// app.use(express.static(path.join(__dirname, '../public')));

// REMOVED: Specific static file serving for dashboard
// app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));

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

// Serve login page directly using the calculated public path
app.get('/login', (req: Request, res: Response, next: NextFunction) => {
  const loginPath = path.join(publicPath, 'login.html');
   res.sendFile(loginPath, (err) => {
    if (err) {
      logger.error(`Error sending login.html: ${err.message}`);
      next(err);
    }
  });
});

// API Routes - Apply rate limiter here
app.use('/api', defaultRateLimiter); // Apply rate limiter only to /api/* routes
app.use('/api/auth', authRoutes);
// Apply conditional authentication to protected routes
app.use('/api/users', authenticate, userRoutes); // Assuming user routes also need auth
app.use('/api/scrape', authenticate, scrapeRoutes);
app.use('/api/transform', authenticate, transformRoutes);
app.use('/api/export', authenticate, exportRoutes);
app.use('/api/crawl', authenticate, crawlRoutes); // Mount crawl routes
// Mount dashboard API routes under /api/dashboard
app.use('/api/dashboard', authenticate, dashboardRoutes); // Keep authentication for API
// Mount view scrape routes (remove authentication middleware for direct viewing)
app.use('/scrape', viewScrapeRoutes);
// REMOVED: Static files for dashboard (Handled by general static middleware now)
// app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard'), { index: 'index.html' }));
app.use('/health', healthRoutes);

// Default route - redirect root to /dashboard/ (with trailing slash)
app.get('/', (req: Request, res: Response) => {
  res.redirect('/dashboard/'); // Add trailing slash
});

// REMOVED: Catch-all route for SPA - Let unmatched routes 404 naturally
/*
app.get('*', (req: Request, res: Response) => {
  // Check if request is for API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ status: 'error', message: 'API endpoint not found' });
  }

  // For non-API routes, redirect to dashboard
  res.redirect('/dashboard');
});
*/

// Apply error handler
app.use(errorHandler);

export function startDashboardServer() {
  app.listen(PORT, () => {
    logger.info(`Web Scraper server running at http://localhost:${PORT}`);
    logger.info(`Dashboard UI available at http://localhost:${PORT}/dashboard`);
    logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
    
    // Start the background worker after the server starts
    startWorker(); 
  });
}

// Start the server automatically only if run directly, not when imported
if (require.main === module && process.env.NODE_ENV !== 'test') {
  startDashboardServer();
}

export default app;
