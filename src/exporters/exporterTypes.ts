import { ScrapedData } from '../core/scraper';

/**
 * Exporter interface
 */
export interface Exporter {
  name: string;
  contentType: string;
  export: (data: ScrapedData | any) => Promise<string | Buffer>;
}
