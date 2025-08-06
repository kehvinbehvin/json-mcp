import { promises as fs } from 'fs';
import { resolve } from 'path';
import { JsonIngestionStrategy } from './JsonIngestionStrategy.js';
import { JsonIngestionResult } from '../types/JsonIngestion.js';

/**
 * Strategy for ingesting JSON from local file system files
 */
export class LocalFileStrategy extends JsonIngestionStrategy {
  private readonly maxFileSize: number = 50 * 1024 * 1024; // 50MB limit
  canHandle(source: string): boolean {
    // Handle local file paths - not URLs
    // Covers: ./file.json, /abs/path/file.json, C:\Windows\file.json, file.json
    return !source.startsWith('http://') && !source.startsWith('https://');
  }

  async ingest(source: string): Promise<JsonIngestionResult> {
    try {
      // Resolve and validate file path - keeping existing logic
      const resolvedPath = resolve(source);
      
      // Check file size before reading
      let fileStats;
      try {
        fileStats = await fs.stat(resolvedPath);
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

      // Check if file size exceeds limit
      if (fileStats.size > this.maxFileSize) {
        return {
          success: false,
          error: {
            type: 'content_too_large',
            message: `File too large (${Math.round(fileStats.size / 1024 / 1024)}MB). This tool is optimized for JSON files under ${Math.round(this.maxFileSize / 1024 / 1024)}MB.`,
            details: { 
              fileSize: fileStats.size,
              maxSize: this.maxFileSize,
              filePath: resolvedPath
            }
          }
        };
      }
      
      // Read file content - keeping existing error handling
      let jsonContent: string;
      try {
        jsonContent = await fs.readFile(resolvedPath, 'utf-8');
      } catch (error) {
        return {
          success: false,
          error: {
            type: 'file_not_found',
            message: `Failed to read file: ${resolvedPath}`,
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
      description: 'Reads JSON data from local file system with 50MB size limit',
      supportedSources: ['Local file paths (relative and absolute)', 'JSON files under 50MB']
    };
  }
}