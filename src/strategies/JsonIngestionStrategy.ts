import { JsonIngestionResult, IngestionMetadata } from '../types/JsonIngestion.js';

/**
 * Abstract strategy interface for ingesting JSON data from various sources
 */
export abstract class JsonIngestionStrategy {
  /**
   * Determines if this strategy can handle the given source
   * @param source - The source identifier (file path, URL, etc.)
   * @returns true if this strategy can handle the source
   */
  abstract canHandle(source: string): boolean;

  /**
   * Ingests JSON content from the source
   * @param source - The source identifier to ingest from
   * @returns Promise resolving to JSON content or error
   */
  abstract ingest(source: string): Promise<JsonIngestionResult>;

  /**
   * Returns metadata about this strategy
   * @returns Strategy metadata
   */
  abstract getMetadata(): { name: string; description: string; supportedSources: string[] };

  /**
   * Validates that the ingested content is valid JSON
   * @param content - Raw content to validate
   * @returns JsonIngestionResult with validation result
   */
  protected validateJsonContent(content: string): JsonIngestionResult {
    try {
      JSON.parse(content);
      return {
        success: true,
        content
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'invalid_json',
          message: 'Invalid JSON format in content',
          details: error
        }
      };
    }
  }
}