export type IntelligenceErrorCode =
  | 'PROVIDER_OFFLINE'
  | 'INVALID_KEY'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'NO_CAPABLE_PROVIDER'
  | 'TASK_FAILED'
  | 'INVALID_PROMPT'
  | 'CAPABILITY_UNSUPPORTED'
  | 'UNKNOWN';

export class IntelligenceError extends Error {
  public readonly code: IntelligenceErrorCode;
  public readonly providerId?: string;
  public readonly details?: unknown;

  constructor(code: IntelligenceErrorCode, message: string, providerId?: string, details?: unknown) {
    super(message);
    this.name = 'IntelligenceError';
    this.code = code;
    this.providerId = providerId;
    this.details = details;
    Object.setPrototypeOf(this, IntelligenceError.prototype);
  }
}
