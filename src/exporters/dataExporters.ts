import { Exporter } from './exporterTypes';
import { ScrapedData } from '../core/scraper';
import logger from '../utils/logger';
import { createObjectCsvStringifier } from 'csv-writer';
import xml2js from 'xml2js';

// Interface for flattened CSV data with index signature
interface FlatCsvData {
  url: string;
  title: string;
  content: string;
  timestamp: string;
  [key: string]: any; // Allow arbitrary string keys
}

/**
 * JSON exporter
 */
export const jsonExporter: Exporter = {
  name: 'json',
  contentType: 'application/json',
  export: async (data: ScrapedData): Promise<string> => {
    logger.debug('Exporting data as JSON');
    return JSON.stringify(data, null, 2);
  }
};

/**
 * CSV exporter
 */
export const csvExporter: Exporter = {
  name: 'csv',
  contentType: 'text/csv',
  export: async (data: ScrapedData): Promise<string> => {
    logger.debug('Exporting data as CSV');
    
    // Flatten the data structure using the interface
    const flatData: FlatCsvData = {
      url: data.url,
      title: data.title,
      content: data.content.replace(/\n/g, ' ').replace(/"/g, '""'), // Keep existing replacements
      timestamp: data.timestamp
    };
    
    // Add metadata fields
    if (typeof data.metadata === 'object') {
      Object.entries(data.metadata).forEach(([key, value]) => {
        if (typeof value === 'string') {
          flatData[`metadata_${key}`] = value.replace(/\n/g, ' ').replace(/"/g, '""');
        } else if (value !== null && value !== undefined) {
          flatData[`metadata_${key}`] = JSON.stringify(value);
        }
      });
    }
    
    // Create CSV
    const header = Object.keys(flatData).map(key => ({ id: key, title: key }));
    const csvStringifier = createObjectCsvStringifier({
      header
    });
    
    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords([flatData]);
  }
};

/**
 * XML exporter
 */
export const xmlExporter: Exporter = {
  name: 'xml',
  contentType: 'application/xml',
  export: async (data: ScrapedData): Promise<string> => {
    logger.debug('Exporting data as XML');
    
    // Create XML structure
    const xmlObj: any = { // Use any for easier dynamic property assignment
      scrapedData: {
        url: data.url,
        title: data.title,
        content: { _cdata: data.content },
        timestamp: data.timestamp,
        metadata: {} // Initialize metadata object
      }
    };
    
    // Add metadata (casting metadata to any is implicitly handled by xmlObj being any)
    if (typeof data.metadata === 'object' && data.metadata !== null) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        if (typeof value === 'string') {
          xmlObj.scrapedData.metadata[key] = { _cdata: value };
        } else if (value !== null && value !== undefined) {
          xmlObj.scrapedData.metadata[key] = { _cdata: JSON.stringify(value) }; // Keep existing logic
        }
      });
    }
    
    // Convert to XML string
    const builder = new xml2js.Builder({
      cdata: true,
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
    
    return builder.buildObject(xmlObj);
  }
};

/**
 * HTML exporter
 */
export const htmlExporter: Exporter = {
  name: 'html',
  contentType: 'text/html',
  export: async (data: ScrapedData): Promise<string> => {
    logger.debug('Exporting data as HTML');
    
    // Create a simple HTML document
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
    h1 { color: #333; }
    .metadata { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .content { margin-top: 20px; }
    .footer { margin-top: 30px; color: #777; font-size: 0.8em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <p>Source: <a href="${escapeHtml(data.url)}">${escapeHtml(data.url)}</a></p>
  <p>Scraped at: ${escapeHtml(data.timestamp)}</p>
  
  <div class="metadata">
    <h2>Metadata</h2>
    <ul>
      ${formatMetadataAsHtml(data.metadata)}
    </ul>
  </div>
  
  <div class="content">
    <h2>Content</h2>
    <div>${formatContentAsHtml(data.content)}</div>
  </div>
  
  <div class="footer">
    <p>Generated by Web Scraper Dual Interface</p>
  </div>
</body>
</html>`;
  }
};

/**
 * Plain text exporter
 */
export const textExporter: Exporter = {
  name: 'text',
  contentType: 'text/plain',
  export: async (data: ScrapedData): Promise<string> => {
    logger.debug('Exporting data as plain text');
    
    return `TITLE: ${data.title}
URL: ${data.url}
TIMESTAMP: ${data.timestamp}

METADATA:
${formatMetadataAsText(data.metadata)}

CONTENT:
${data.content}`;
  }
};

/**
 * Markdown exporter
 */
export const markdownExporter: Exporter = {
  name: 'markdown',
  contentType: 'text/markdown',
  export: async (data: ScrapedData): Promise<string> => {
    logger.debug('Exporting data as Markdown');
    
    return `# ${data.title}

> Source: [${data.url}](${data.url})  
> Scraped at: ${data.timestamp}

## Metadata

${formatMetadataAsMarkdown(data.metadata)}

## Content

${data.content.replace(/\n/g, '\n\n')}
`;
  }
};

// Helper functions
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMetadataAsHtml(metadata: any): string {
  if (!metadata || typeof metadata !== 'object') return '';
  
  return Object.entries(metadata)
    .map(([key, value]) => {
      const formattedValue = typeof value === 'object' 
        ? `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>` 
        : escapeHtml(String(value));
      return `<li><strong>${escapeHtml(key)}:</strong> ${formattedValue}</li>`;
    })
    .join('\n');
}

function formatContentAsHtml(content: string): string {
  return escapeHtml(content).replace(/\n/g, '<br>');
}

function formatMetadataAsText(metadata: any): string {
  if (!metadata || typeof metadata !== 'object') return '';
  
  return Object.entries(metadata)
    .map(([key, value]) => {
      const formattedValue = typeof value === 'object' 
        ? JSON.stringify(value, null, 2) 
        : String(value);
      return `${key}: ${formattedValue}`;
    })
    .join('\n');
}

function formatMetadataAsMarkdown(metadata: any): string {
  if (!metadata || typeof metadata !== 'object') return '';
  
  return Object.entries(metadata)
    .map(([key, value]) => {
      const formattedValue = typeof value === 'object' 
        ? `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`` 
        : String(value);
      return `- **${key}**: ${formattedValue}`;
    })
    .join('\n');
}
