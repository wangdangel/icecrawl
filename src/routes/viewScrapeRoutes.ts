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
        <style>
          body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
          pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
          h1, h2, h3 { color: #333; }
          a { color: #007bff; }
        </style>
      </head>
      <body>
        <h1>${scrapedPage.title || 'Untitled Scrape'}</h1>
        <p><strong>URL:</strong> <a href="${scrapedPage.url}" target="_blank">${scrapedPage.url}</a></p>
        <p><strong>Scraped At:</strong> ${scrapedPage.createdAt.toLocaleString()}</p>
        ${scrapedPage.category ? `<p><strong>Category:</strong> ${scrapedPage.category}</p>` : ''}
        ${scrapedPage.notes ? `<p><strong>Notes:</strong> ${scrapedPage.notes}</p>` : ''}
        
        <hr>
        <h2>Content</h2>
        <div>${scrapedPage.content}</div> 
        
        <hr>
        ${metadataHtml}
        
        <hr>
        ${tagsHtml}

      </body>
      </html>
    `);

  } catch (error) {
    logger.error({ message: `Error fetching scraped page ${id}`, error });
    next(error); // Pass to global error handler
  }
});

export default router;
