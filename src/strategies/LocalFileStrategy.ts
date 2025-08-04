import { promises as fs } from 'fs';
import { resolve } from 'path';
import { JsonIngestionStrategy } from './JsonIngestionStrategy.js';
import { JsonIngestionResult } from '../types/JsonIngestion.js';

/**
 * Strategy for ingesting JSON from local file system files
 */
export class LocalFileStrategy extends JsonIngestionStrategy {
  canHandle(source: string): boolean {
    // Handle local file paths - not URLs
    // Covers: ./file.json, /abs/path/file.json, C:\Windows\file.json, file.json
    return !source.startsWith('http://') && !source.startsWith('https://');
  }

  async ingest(source: string): Promise<JsonIngestionResult> {
    try {
      // Resolve and validate file path - keeping existing logic
      const resolvedPath = resolve(source);
      
      // Read file content - keeping existing error handling
      let jsonContent: string;
      try {
        jsonContent = await fs.readFile(resolvedPath, 'utf-8');
      } catch (error) {
        return {
          success: false,
          error: {
            type: 'file_not_found',
            message: `File not found: ${resolvedPath}`,
            details: error
          }
        };
      }

      // Validate JSON content
      return this.validateJsonContent(jsonContent);

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Unexpected error during file processing',
          details: error
        }
      };
    }
  }

  getMetadata() {
    return {
      name: 'LocalFileStrategy',
      description: 'Reads JSON data from local file system',
      supportedSources: ['Local file paths (relative and absolute)']
    };
  }
}