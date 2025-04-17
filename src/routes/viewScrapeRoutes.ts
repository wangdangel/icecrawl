import { Router, Request, Response, NextFunction } from 'express';
// Remove local PrismaClient import
import prisma from '../db/prismaClient'; // Import shared prisma instance
import logger from '../utils/logger';

const router = Router();
// Remove local prisma instantiation

// Route to view a single scraped page
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  logger.info({ message: `Attempting to view scraped page`, id }); // Log entry

  try {
    logger.debug({ message: `Querying database for scraped page`, id }); // Log before query
    const scrapedPage = await prisma.scrapedPage.findUnique({
      where: { id: id },
      include: { tags: true }, // Include tags if needed
    });
    logger.debug({ message: `Database query result for scraped page ${id}`, found: !!scrapedPage }); // Log after query

    if (!scrapedPage) {
      logger.warn({ message: `Scraped page not found in database`, id });
      return res.status(404).send('Scraped page not found');
    }

    logger.info({ message: `Rendering scraped page`, id, url: scrapedPage.url });
    // Basic HTML rendering (can be improved with a template engine later)
    let metadataHtml = '<h3>Metadata</h3><pre>No metadata</pre>';
    if (scrapedPage.metadata) {
        try {
            const metaObj = JSON.parse(scrapedPage.metadata);
            metadataHtml = `<h3>Metadata</h3><pre>${JSON.stringify(metaObj, null, 2)}</pre>`;
        } catch (e) {
            metadataHtml = `<h3>Metadata (Raw)</h3><pre>${scrapedPage.metadata}</pre>`;
        }
    }
    
    let tagsHtml = '<h3>Tags</h3><p>No tags</p>';
    if (scrapedPage.tags && scrapedPage.tags.length > 0) {
        tagsHtml = '<h3>Tags</h3><ul>';
        scrapedPage.tags.forEach((tag: any) => { // Use 'any' type
            tagsHtml += `<li>${tag.name}</li>`;
        });
        tagsHtml += '</ul>';
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${scrapedPage.title || 'Scraped Page'}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link rel="stylesheet" href="https://unpkg.com/tailwindcss@^2.0/dist/tailwind.min.css">
        <style>
          body { font-family: sans-serif; line-height: 1.6; padding: 0; margin: 0; }
          pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
          h1, h2, h3 { color: #333; }
          a { color: #007bff; }
        </style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <nav class="bg-indigo-600 text-white shadow-md mb-8">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div class="flex items-center">
                <a href="/dashboard/index.html" class="flex items-center group">
                  <img src="/dashboard/img/logo.png" alt="IceCrawl Logo" class="h-8 w-8 mr-2" />
                  <span class="text-xl font-bold group-hover:text-indigo-200 transition">IceCrawl</span>
                </a>
              </div>
              <div>
                <a href="/dashboard/index.html#scrape-jobs" class="inline-block px-4 py-2 bg-white text-indigo-600 rounded shadow hover:bg-indigo-50 font-semibold"><i class="fas fa-arrow-left mr-2"></i>Back to Scrape Jobs</a>
              </div>
            </div>
          </div>
        </nav>
        <div class="w-full px-4 sm:px-8 lg:px-16 xl:px-32 py-4">
          <div class="bg-white shadow rounded-lg p-8 w-full">
            <h1 class="text-2xl font-bold mb-2">${scrapedPage.title || 'Untitled Scrape'}</h1>
            <p><strong>URL:</strong> <a href="${scrapedPage.url}" target="_blank" class="text-indigo-600 underline">${scrapedPage.url}</a></p>
            <p><strong>Scraped At:</strong> ${scrapedPage.createdAt.toLocaleString()}</p>
            ${scrapedPage.category ? `<p><strong>Category:</strong> ${scrapedPage.category}</p>` : ''}
            ${scrapedPage.notes ? `<p><strong>Notes:</strong> ${scrapedPage.notes}</p>` : ''}
            <hr class="my-6">
            <h2 class="text-xl font-semibold mb-2">Content</h2>
            <div class="prose max-w-none mb-6">${scrapedPage.content}</div>
            <hr class="my-6">
            ${metadataHtml}
            <hr class="my-6">
            ${tagsHtml}
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    logger.error({ message: `Error fetching scraped page ${id}`, error });
    next(error); // Pass to global error handler
  }
});

export default router;
