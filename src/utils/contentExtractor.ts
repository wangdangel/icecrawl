import * as cheerio from 'cheerio';
import logger from './logger';

// Elements that commonly contain main content
const CONTENT_SELECTORS = [
  'article',
  'main',
  '.content',
  '#content',
  '.article',
  '.post',
  '.entry',
  '.blog-post',
  '[role="main"]',
  '.main-content',
];

// Elements that typically contain noise
const NOISE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  '.sidebar',
  '.comments',
  '.advertisement',
  '.ads',
  '.nav',
  '.menu',
  '.navbar',
  '.social',
  '.share',
  '.related',
  '.recommended',
  '#comments',
  'script',
  'style',
  'iframe',
];

/**
 * Extract the main content from an HTML document
 * 
 * @param html - The HTML to extract content from
 * @returns Extracted main content
 */
export function extractMainContent(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Remove noisy elements
    $(NOISE_SELECTORS.join(', ')).remove();
    
    // Try to find the main content container
    for (const selector of CONTENT_SELECTORS) {
      const element = $(selector);
      if (element.length > 0) {
        // Found a potential content container
        const text = element.text().trim();
        if (text.length > 100) {  // Ensure it's substantial enough
          return cleanText(text);
        }
      }
    }
    
    // Fallback: get content from body
    const bodyText = $('body').text().trim();
    return cleanText(bodyText);
  } catch (error) {
    logger.error({
      message: 'Content extraction failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return '';
  }
}

/**
 * Extract metadata from HTML
 * 
 * @param $ - Cheerio instance
 * @returns Extracted metadata
 */
export function extractMetadata($: cheerio.CheerioAPI): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  
  // Basic metadata
  metadata.title = $('title').text().trim() || '';
  metadata.description = $('meta[name="description"]').attr('content') || '';
  metadata.keywords = $('meta[name="keywords"]').attr('content') || '';
  
  // OpenGraph metadata
  const ogProps = [
    'title', 'description', 'image', 'url', 'type', 'site_name'
  ];
  
  ogProps.forEach(prop => {
    const value = $(`meta[property="og:${prop}"]`).attr('content');
    if (value) {
      metadata[`og_${prop}`] = value;
    }
  });
  
  // Twitter Card metadata
  const twitterProps = [
    'card', 'site', 'creator', 'title', 'description', 'image'
  ];
  
  twitterProps.forEach(prop => {
    const value = $(`meta[name="twitter:${prop}"]`).attr('content');
    if (value) {
      metadata[`twitter_${prop}`] = value;
    }
  });
  
  // Try to extract JSON-LD
  try {
    const jsonLdScript = $('script[type="application/ld+json"]').first();
    if (jsonLdScript.length) {
      const jsonLdText = jsonLdScript.html();
      if (jsonLdText) {
        metadata.jsonLd = JSON.parse(jsonLdText);
      }
    }
  } catch (error) {
    logger.warn({
      message: 'Failed to parse JSON-LD data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return metadata;
}

/**
 * Extract all links from the HTML
 * 
 * @param $ - Cheerio instance
 * @returns Array of extracted links
 */
export function extractLinks($: cheerio.CheerioAPI): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();
    
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({
        href,
        text: text || href,
      });
    }
  });
  
  return links;
}

/**
 * Clean and normalize text
 * 
 * @param text - Text to clean
 * @returns Cleaned text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')    // Replace multiple whitespace with a single space
    .replace(/\n+/g, '\n')   // Replace multiple newlines with a single newline
    .trim();                 // Remove leading/trailing whitespace
}
