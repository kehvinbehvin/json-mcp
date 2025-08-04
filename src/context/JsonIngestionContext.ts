import { JsonIngestionStrategy } from '../strategies/JsonIngestionStrategy.js';
import { LocalFileStrategy } from '../strategies/LocalFileStrategy.js';
import { HttpJsonStrategy } from '../strategies/HttpJsonStrategy.js';
import { JsonIngestionResult } from '../types/JsonIngestion.js';

/**
 * Context class that manages strategy selection and execution
 */
export class JsonIngestionContext {
  private strategies: JsonIngestionStrategy[] = [];

  constructor() {
    // Phase 1: LocalFileStrategy
    this.registerStrategy(new LocalFileStrategy());
    
    // Phase 2: HttpJsonStrategy (supports both HTTP and HTTPS)
    this.registerStrategy(new HttpJsonStrategy());
  }

  /**
   * Register a new ingestion strategy
   * @param strategy - Strategy to register
   */
  registerStrategy(strategy: JsonIngestionStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Find the appropriate strategy for the given source
   * @param source - Source identifier to find strategy for
   * @returns Strategy that can handle the source, or null if none found
   */
  private findStrategy(source: string): JsonIngestionStrategy | null {
    return this.strategies.find(strategy => strategy.canHandle(source)) || null;
  }

  /**
   * Ingest JSON content from the given source using the appropriate strategy
   * @param source - Source identifier (file path, URL, etc.)
   * @returns Promise resolving to JSON content or error
   */
  async ingest(source: string): Promise<JsonIngestionResult> {
    const strategy = this.findStrategy(source);
    
    if (!strategy) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: `No strategy found to handle source: ${source}`,
          details: { 
            source, 
            availableStrategies: this.strategies.map(s => s.getMetadata().name)
          }
        }
      };
    }

    return await strategy.ingest(source);
  }

  /**
   * Get information about all registered strategies
   * @returns Array of strategy metadata
   */
  getAvailableStrategies() {
    return this.strategies.map(strategy => strategy.getMetadata());
  }
}