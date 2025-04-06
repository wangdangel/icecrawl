import { Exporter } from './exporterTypes';
import logger from '../utils/logger';
import { 
  jsonExporter, 
  csvExporter, 
  xmlExporter, 
  htmlExporter, 
  textExporter, 
  markdownExporter 
} from './dataExporters';

/**
 * Exporter manager for handling different export formats
 */
export class ExporterManager {
  private exporters: Map<string, Exporter> = new Map();
  
  constructor() {
    // Register built-in exporters
    this.registerExporter(jsonExporter);
    this.registerExporter(csvExporter);
    this.registerExporter(xmlExporter);
    this.registerExporter(htmlExporter);
    this.registerExporter(textExporter);
    this.registerExporter(markdownExporter);
  }
  
  /**
   * Register an exporter
   * 
   * @param exporter - Exporter to register
   */
  registerExporter(exporter: Exporter): void {
    this.exporters.set(exporter.name, exporter);
    logger.debug(`Registered exporter: ${exporter.name}`);
  }
  
  /**
   * Get available exporters
   * 
   * @returns Array of exporter information
   */
  getAvailableExporters(): Array<{ name: string; contentType: string }> {
    return Array.from(this.exporters.values()).map(e => ({
      name: e.name,
      contentType: e.contentType
    }));
  }
  
  /**
   * Export data using the specified format
   * 
   * @param format - Export format
   * @param data - Data to export
   * @returns Exported data and content type
   */
  async export(format: string, data: any): Promise<{ data: string | Buffer; contentType: string }> {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new Error(`Exporter not found: ${format}`);
    }
    
    logger.debug(`Exporting data as ${format}`);
    const exportedData = await exporter.export(data);
    
    return {
      data: exportedData,
      contentType: exporter.contentType
    };
  }
}

// Create and export a singleton instance
export const exporterManager = new ExporterManager();
