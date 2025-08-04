import { JsonIngestionStrategy } from './JsonIngestionStrategy.js';
import { JsonIngestionResult } from '../types/JsonIngestion.js';

/**
 * Strategy for ingesting JSON from HTTP/HTTPS URLs
 * Handles both static JSON files and API endpoints that return JSON
 * Unified strategy for all HTTP and HTTPS JSON sources
 */
export class HttpJsonStrategy extends JsonIngestionStrategy {
  private readonly requestTimeout: number = 10000; // 10 second timeout
  private readonly maxResponseSize: number = 50 * 1024 * 1024; // 50MB limit

  canHandle(source: string): boolean {
    // Handle both HTTP and HTTPS URLs
    return source.startsWith('http://') || source.startsWith('https://');
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

      // Accept both HTTP and HTTPS protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return {
          success: false,
          error: {
            type: 'invalid_url',
            message: 'Only HTTP and HTTPS URLs are supported',
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

      // Check response status with enhanced error detection
      if (!response.ok) {
        // Handle authentication/authorization errors (401/403)
        if (response.status === 401 || response.status === 403) {
          let errorMessage = 'This endpoint requires authentication or access is denied.';
          
          if (response.status === 401) {
            errorMessage = 'Authentication required: This endpoint needs valid credentials. Verify this is a public API endpoint.';
          } else if (response.status === 403) {
            errorMessage = 'Access forbidden: This endpoint may require authentication, be restricted by region, or have IP restrictions. Verify this is a publicly accessible endpoint.';
          }

          // Try to get additional context from response body
          let responsePreview = '';
          try {
            const responseText = await response.text();
            responsePreview = responseText.substring(0, 200);
          } catch (e) {
            // Ignore errors reading response body
          }

          return {
            success: false,
            error: {
              type: 'authentication_required',
              message: errorMessage,
              details: { 
                status: response.status,
                statusText: response.statusText,
                url: source,
                responsePreview: responsePreview || undefined
              }
            }
          };
        }

        // Handle rate limiting
        if (response.status === 429) {
          return {
            success: false,
            error: {
              type: 'rate_limit_exceeded',
              message: 'API rate limit exceeded. Please wait before making more requests to this endpoint.',
              details: { 
                status: response.status,
                statusText: response.statusText,
                url: source,
                retryAfter: response.headers.get('Retry-After') || undefined
              }
            }
          };
        }

        // Handle server errors (500-series)
        if (response.status >= 500) {
          return {
            success: false,
            error: {
              type: 'server_error',
              message: `Server error (HTTP ${response.status}): This is likely a temporary issue with the endpoint. Try again later.`,
              details: { 
                status: response.status,
                statusText: response.statusText,
                url: source
              }
            }
          };
        }

        // Handle other client errors (404, etc.)
        return {
          success: false,
          error: {
            type: 'network_error',
            message: `HTTP ${response.status}: ${response.statusText}. ${response.status === 404 ? 'Endpoint not found - verify the URL is correct.' : 'Client error occurred.'}`,
            details: { 
              status: response.status, 
              statusText: response.statusText,
              url: source 
            }
          }
        };
      }

      // Check content size before downloading
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > this.maxResponseSize) {
          return {
            success: false,
            error: {
              type: 'content_too_large',
              message: `Response too large (${Math.round(size / 1024 / 1024)}MB). This tool is optimized for JSON files under ${Math.round(this.maxResponseSize / 1024 / 1024)}MB.`,
              details: { 
                contentLength: size,
                maxSize: this.maxResponseSize,
                url: source
              }
            }
          };
        }
      }

      // Get response text with size protection
      let content: string;
      try {
        content = await response.text();
        
        // Check actual content size after reading (for cases without Content-Length header)
        const actualSize = new TextEncoder().encode(content).length;
        if (actualSize > this.maxResponseSize) {
          return {
            success: false,
            error: {
              type: 'content_too_large',
              message: `Response too large (${Math.round(actualSize / 1024 / 1024)}MB after reading). This tool is optimized for JSON files under ${Math.round(this.maxResponseSize / 1024 / 1024)}MB.`,
              details: { 
                actualSize: actualSize,
                maxSize: this.maxResponseSize,
                url: source
              }
            }
          };
        }
      } catch (error) {
        return {
          success: false,
          error: {
            type: 'network_error',
            message: 'Failed to read response content. This may be due to network issues or the response being too large.',
            details: { error, url: source }
          }
        };
      }

      // For HTTPS strategy, we're flexible about content-type
      // We'll validate the content is JSON rather than checking content-type headers
      // This allows us to work with APIs that don't set proper content-type headers
      const validation = this.validateJsonContent(content);
      
      if (!validation.success) {
        // If JSON validation fails, provide more context about content-type and response
        const contentType = response.headers.get('content-type') || 'unknown';
        const contentPreview = content.substring(0, 200);
        
        let enhancedMessage = `Response content is not valid JSON. Content-Type: ${contentType}.`;
        
        // Provide specific guidance based on content preview
        if (contentPreview.toLowerCase().includes('<!doctype html') || contentPreview.toLowerCase().includes('<html')) {
          enhancedMessage += ' The response appears to be HTML - verify the URL points to a JSON endpoint, not a web page.';
        } else if (contentPreview.toLowerCase().includes('<?xml')) {
          enhancedMessage += ' The response appears to be XML - this tool only supports JSON format.';
        } else if (contentPreview.trim() === '') {
          enhancedMessage += ' The response is empty - the endpoint may not be returning data.';
        } else {
          enhancedMessage += ' Verify the endpoint returns valid JSON format.';
        }

        return {
          success: false,
          error: {
            type: 'invalid_json',
            message: enhancedMessage,
            details: { 
              contentType, 
              url: source,
              contentPreview,
              responseSize: content.length
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
      name: 'HttpJsonStrategy',
      description: 'Fetches JSON data from HTTP/HTTPS URLs (static files and API endpoints)',
      supportedSources: ['HTTP/HTTPS URLs serving JSON content', 'JSON API endpoints', 'Static .json files', 'Any HTTP/HTTPS URL returning valid JSON']
    };
  }
}