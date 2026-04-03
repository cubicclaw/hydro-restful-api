/**
 * HydroOJ CLI Error Handling
 */

export interface CliError {
  code: string;
  message: string;
  httpStatus?: number;
  hint?: string;
}

export function normalizeError(err: any): CliError {
  // Accept already-normalized CliError objects (but not native Node.js errors
  // that happen to have 'code' and 'message' properties like ENOTFOUND)
  const SYSTEM_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ERR_ASSERTION', 'EMFILE', 'EBADF']);
  if (err && typeof err === 'object' && err.code && err.message && !SYSTEM_CODES.has(err.code)) {
    return err as CliError;
  }

  const msg = err instanceof Error ? err.message : String(err);
  
  // Extract HTTP status if present in message (e.g. "HTTP 404: ...")
  const httpMatch = msg.match(/HTTP (\d{3})/);
  const httpStatus = httpMatch ? parseInt(httpMatch[1], 10) : undefined;

  let code = 'UNKNOWN_ERROR';
  let cleanMessage = msg;

  // Check error code first (system errors like ENOTFOUND have a .code property)
  const rawCode = err?.code;
  if (rawCode === 'ECONNREFUSED' || rawCode === 'ENOTFOUND' || rawCode === 'ETIMEDOUT' || rawCode === 'EAI_AGAIN') {
    code = 'NETWORK_ERROR';
  } else if (msg.includes('NOT_FOUND')) {
    code = 'NOT_FOUND';
  } else if (msg.includes('401') || msg.includes('403') || msg.includes('Not logged in')) {
    code = 'UNAUTHORIZED';
  } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
    code = 'NETWORK_ERROR';
  } else if (msg.includes('timeout')) {
    code = 'TIMEOUT';
  }

  // If the message has "HTTP 404: SOME_CODE - Message", try to extract them
  const detailMatch = msg.match(/HTTP \d{3}: (.*?) — (.*)/);
  if (detailMatch) {
    code = detailMatch[1];
    cleanMessage = detailMatch[2];
  }

  const error: CliError = {
    code,
    message: cleanMessage,
  };

  if (httpStatus) {
    error.httpStatus = httpStatus;
  }

  // Add hints for common errors
  if (code === 'UNAUTHORIZED') {
    error.hint = 'Try running "hydrooj-cli login" to refresh your session.';
  } else if (code === 'NETWORK_ERROR' || (httpStatus && httpStatus >= 500)) {
    error.hint = 'Verify your base URL and that the hydrooj-rest-api addon is installed and active.';
  }

  return error;
}
