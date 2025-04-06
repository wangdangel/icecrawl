import * as cheerio from 'cheerio';
import logger from './logger';

/**
 * Content filter configuration
 */
export interface FilterOptions {
  includeText?: boolean;
  includeLinks?: boolean;
  includeImages?: boolean;
  includeMeta?: boolean;
  includeScripts?: boolean;
  textMinLength?: number;
  specificSelectors?: string[];
  excludeSelectors?: string[];
  maxContentLength?: number;
  includeHeadings?: boolean;
  extractTables?: boolean;
  includeSocialMedia?: boolean;
  maxLinks?: number;
  maxImages?: number;
  keywords?: string[];
}

/**
 * Filtered content result
 */
export interface FilteredContent {
  text: string;
  links: Array<{ href: string; text: string }>;
  images: Array<{ src: string; alt: string; dimensions?: { width?: number; height?: number } }>;
  metadata: Record<string, string>;
  headings: Array<{ level: number; text: string }>;
  tables: Array<string[][]>;
  keywordMatches?: Record<string, number>;
}

/**
 * Apply content filters to HTML
 * 
 * @param html - HTML content to filter
 * @param options - Filter options
 * @returns Filtered content
 */
export function applyContentFilters(html: string, options: FilterOptions = {}): FilteredContent {
  const $ = cheerio.load(html);
  const result: FilteredContent = {
    text: '',
    links: [],
    images: [],
    metadata: {},
    headings: [],
    tables: []
  };
  
  // Apply exclusions first
  if (options.excludeSelectors?.length) {
    $(options.excludeSelectors.join(', ')).remove();
  }
  
  // Extract text if requested
  if (options.includeText !== false) {
    if (options.specificSelectors?.length) {
      // Get text only from specific selectors
      result.text = options.specificSelectors
        .map(selector => $(selector).text().trim())
        .filter(text => text.length > (options.textMinLength || 0))
        .join('\n\n');
    } else {
      // Get body text
      result.text = $('body').text().trim();
    }
    
    // Apply max length if specified
    if (options.maxContentLength && result.text.length > options.maxContentLength) {
      result.text = result.text.substring(0, options.maxContentLength) + '...';
    }
  }
  
  // Extract links if requested
  if (options.includeLinks !== false) {
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        result.links.push({
          href,
          text: text || href,
        });
      }
    });
    
    // Apply max links limit if specified
    if (options.maxLinks && result.links.length > options.maxLinks) {
      result.links = result.links.slice(0, options.maxLinks);
    }
  }
  
  // Extract images if requested
  if (options.includeImages) {
    $('img').each((_, element) => {
      const src = $(element).attr('src');
      const alt = $(element).attr('alt') || '';
      
      if (src) {
        const dimensions = {
          width: $(element).attr('width') ? parseInt($(element).attr('width') || '0') : undefined,
          height: $(element).attr('height') ? parseInt($(element).attr('height') || '0') : undefined
        };
        
        result.images.push({
          src,
          alt,
          dimensions: dimensions.width || dimensions.height ? dimensions : undefined
        });
      }
    });
    
    // Apply max images limit if specified
    if (options.maxImages && result.images.length > options.maxImages) {
      result.images = result.images.slice(0, options.maxImages);
    }
  }
  
  // Extract metadata if requested
  if (options.includeMeta) {
    $('meta').each((_, element) => {
      const name = $(element).attr('name') || $(element).attr('property') || '';
      const content = $(element).attr('content') || '';
      
      if (name && content) {
        result.metadata[name] = content;
      }
    });
  }
  
  // Extract headings if requested
  if (options.includeHeadings) {
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const level = parseInt(element.tagName.toLowerCase().replace('h', ''));
      const text = $(element).text().trim();
      
      if (text) {
        result.headings.push({
          level,
          text
        });
      }
    });
  }
  
  // Extract tables if requested
  if (options.extractTables) {
    $('table').each((_, tableElement) => {
      const table: string[][] = [];
      
      $(tableElement).find('tr').each((_, rowElement) => {
        const row: string[] = [];
        
        $(rowElement).find('th, td').each((_, cellElement) => {
          row.push($(cellElement).text().trim());
        });
        
        if (row.length > 0) {
          table.push(row);
        }
      });
      
      if (table.length > 0) {
        result.tables.push(table);
      }
    });
  }
  
  // Count keyword matches if specified
  if (options.keywords && options.keywords.length > 0) {
    result.keywordMatches = {};
    
    options.keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = (result.text.match(regex) || []).length;
      
      if (matches > 0) {
        result.keywordMatches![keyword] = matches;
      }
    });
  }
  
  return result;
}
