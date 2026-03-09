interface ApiPayload<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function mapStatusMessage(status: number, fallbackMessage: string): string {
  if (status === 400) return "Invalid data. Check and try again";
  if (status === 401) return "Please sign in again";
  if (status === 403) return "You do not have permission";
  if (status === 404) return "Requested record was not found";
  if (status === 409) return "Conflict detected. Refresh and retry";
  if (status >= 500) return "Server error. Please try again";
  return fallbackMessage;
}

export function toUserErrorMessage(
  status: number,
  apiError: string | undefined,
  fallbackMessage: string
): string {
  const normalized = apiError?.trim();

  if (
    normalized &&
    normalized.length > 0 &&
    normalized.toLowerCase() !== "unexpected error"
  ) {
    return normalized;
  }

  return mapStatusMessage(status, fallbackMessage);
}

export function requireApiData<T>(
  response: Response,
  payload: ApiPayload<T>,
  fallbackMessage: string
): T {
  if (response.ok && payload.ok && payload.data !== undefined) {
    return payload.data;
  }

  throw new Error(toUserErrorMessage(response.status, payload.error, fallbackMessage));
}

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

