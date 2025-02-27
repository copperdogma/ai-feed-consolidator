/**
 * Custom error class for API-related errors.
 * Includes HTTP status code and optional error details.
 * 
 * @example
 * ```ts
 * throw new APIError('Failed to fetch data', 404, { reason: 'Not found' });
 * ```
 */
export class APIError extends Error {
  /**
   * Creates a new APIError instance
   * @param message - The error message
   * @param status - The HTTP status code
   * @param details - Optional error details from the API response
   */
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Helper function to handle API responses with proper error handling.
 * Automatically parses JSON responses and throws APIError for non-200 responses.
 * 
 * Features:
 * - JSON response parsing
 * - Error details extraction
 * - Typed response handling
 * - Consistent error format
 * 
 * @param response - The fetch Response object
 * @param errorMessage - The error message to use if the request fails
 * @returns Promise resolving to the parsed response data
 * @throws APIError if the response is not ok
 * 
 * @example
 * ```ts
 * const data = await handleAPIResponse(
 *   await fetch('/api/data'),
 *   'Failed to fetch data'
 * );
 * ```
 */
export async function handleAPIResponse<T>(
  response: Response,
  errorMessage: string
): Promise<T> {
  if (!response.ok) {
    let details;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    throw new APIError(
      errorMessage,
      response.status,
      details
    );
  }

  return response.json();
}

/**
 * Helper function to fetch data from the API
 * @param endpoint API endpoint to fetch from
 * @param options Fetch options
 * @returns Promise that resolves to the response data
 * @throws APIError if the request fails
 */
export async function fetchFromAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, options);
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new APIError(
      data.message || 'An error occurred while fetching data',
      response.status
    );
  }
  
  return data as T;
}

/**
 * Helper function to make a POST request to the API
 * @param endpoint API endpoint to post to
 * @param body Request body
 * @returns Promise that resolves to the response data
 */
export async function postToAPI<T, R = any>(
  endpoint: string,
  body: R
): Promise<T> {
  return fetchFromAPI<T>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Helper function to make a PATCH request to the API
 * @param endpoint API endpoint to patch
 * @param body Request body
 * @returns Promise that resolves to the response data
 */
export async function patchAPI<T, R = any>(
  endpoint: string,
  body: R
): Promise<T> {
  return fetchFromAPI<T>(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Helper function to make a DELETE request to the API
 * @param endpoint API endpoint to delete from
 * @returns Promise that resolves to the response data
 */
export async function deleteFromAPI<T>(endpoint: string): Promise<T> {
  return fetchFromAPI<T>(endpoint, {
    method: 'DELETE',
  });
} 