import { JsonIngestionStrategy } from './JsonIngestionStrategy.js';
import { JsonIngestionResult } from '../types/JsonIngestion.js';

/**
 * Strategy for ingesting JSON from HTTPS URLs
 * Handles both static JSON files and API endpoints that return JSON
 * Unified strategy for all HTTPS JSON sources
 */
export class HttpsJsonStrategy extends JsonIngestionStrategy {
  private readonly requestTimeout: number = 10000; // 10 second timeout

  canHandle(source: string): boolean {
    // Handle HTTPS URLs only (for security)
    if (!source.startsWith('https://')) {
      return false;
    }

    // For Phase 2, we'll handle URLs that look like JSON files
    // or we'll try them and check the content-type
    return true; // We'll validate the content-type after fetching
  }

  async ingest(source: string): Promise<JsonIngestionResult> {
    try {
      // Validate URL format
      let url: URL;
      try {
        url = new URL(source);
      } catch (error) {
        return {
          success: false,
          error: {
            type: 'invalid_url',
            message: `Invalid URL format: ${source}`,
            details: error
          }
        };
      }

      // Only allow HTTPS for security
      if (url.protocol !== 'https:') {
        return {
          success: false,
          error: {
            type: 'invalid_url',
            message: 'Only HTTPS URLs are supported for security reasons',
            details: { protocol: url.protocol }
          }
        };
      }

      // Fetch the content
      let response: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        response = await fetch(source, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'json-mcp-filter/1.0.2'
          }
        });

        clearTimeout(timeoutId);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            error: {
              type: 'network_error',
              message: `Request timeout after ${this.requestTimeout}ms`,
              details: error
            }
          };
        }

        return {
          success: false,
          error: {
            type: 'network_error',
            message: `Failed to fetch from ${source}: ${error instanceof Error ? error.message : String(error)}`,
            details: error
          }
        };
      }

      // Check response status
      if (!response.ok) {
        return {
          success: false,
          error: {
            type: 'network_error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            details: { 
              status: response.status, 
              statusText: response.statusText,
              url: source 
            }
          }
        };
      }

      // Check response status for API-specific errors
      if (response.status === 429) {
        return {
          success: false,
          error: {
            type: 'rate_limit_exceeded',
            message: 'API rate limit exceeded',
            details: { 
              status: response.status,
              statusText: response.statusText,
              url: source
            }
          }
        };
      }

      // Get response text
      let content: string;
      try {
        content = await response.text();
      } catch (error) {
        return {
          success: false,
          error: {
            type: 'network_error',
            message: 'Failed to read response content',
            details: error
          }
        };
      }

      // For HTTPS strategy, we're flexible about content-type
      // We'll validate the content is JSON rather than checking content-type headers
      // This allows us to work with APIs that don't set proper content-type headers
      const validation = this.validateJsonContent(content);
      
      if (!validation.success) {
        // If JSON validation fails, provide more context about content-type
        const contentType = response.headers.get('content-type') || 'unknown';
        return {
          success: false,
          error: {
            type: 'invalid_json',
            message: `Response content is not valid JSON. Content-Type: ${contentType}`,
            details: { 
              contentType, 
              url: source,
              contentPreview: content.substring(0, 200)
            }
          }
        };
      }

      return validation;

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Unexpected error during HTTPS JSON ingestion',
          details: error
        }
      };
    }
  }

  getMetadata() {
    return {
      name: 'HttpsJsonStrategy',
      description: 'Fetches JSON data from HTTPS URLs (static files and API endpoints)',
      supportedSources: ['HTTPS URLs serving JSON content', 'JSON API endpoints', 'Static .json files', 'Any HTTPS URL returning valid JSON']
    };
  }
}