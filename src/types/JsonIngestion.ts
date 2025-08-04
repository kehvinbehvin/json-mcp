// Shared types for JSON ingestion strategies

export interface JsonIngestionError {
  readonly type: 'file_not_found' | 'invalid_json' | 'network_error' | 'invalid_url' | 'unsupported_content_type' | 'rate_limit_exceeded' | 'validation_error' | 'authentication_required' | 'server_error' | 'content_too_large';
  readonly message: string;
  readonly details?: unknown;
}

export type JsonIngestionResult = {
  readonly success: true;
  readonly content: string;
} | {
  readonly success: false;
  readonly error: JsonIngestionError;
};

export interface IngestionMetadata {
  readonly source: string;
  readonly strategy: string;
  readonly contentType?: string;
  readonly size?: number;
  readonly fetchedAt: Date;
}