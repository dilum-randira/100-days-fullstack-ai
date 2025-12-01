/**
 * Simple reusable HTTP client using the Fetch API.
 *
 * This wrapper focuses on a clean API and strong TypeScript typing,
 * not on handling every edge case.
 */

export interface HttpClientConfig {
  /** Base URL that will be prefixed to all request paths. */
  baseUrl: string;
  /** Default headers sent with every request (can be overridden per call). */
  defaultHeaders?: Record<string, string>;
  /** Optional timeout in milliseconds (not enforced in this simple example). */
  timeoutMs?: number;
}

/**
 * A small HTTP client around `fetch` with JSON handling and typed responses.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // remove trailing slash
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  /**
   * Build a full URL from the baseUrl and a relative path.
   *
   * @param path - Relative path like "/posts" or "posts/1".
   * @returns Full URL string.
   */
  private buildUrl(path: string): string {
    if (!path.startsWith("/")) {
      return `${this.baseUrl}/${path}`;
    }
    return `${this.baseUrl}${path}`;
  }

  /**
   * Merge default headers with request-specific headers.
   * Request headers take precedence.
   *
   * @param headers - Optional headers passed for a single request.
   * @returns Combined headers object.
   */
  private mergeHeaders(headers?: Record<string, string>): HeadersInit {
    return {
      ...this.defaultHeaders,
      ...(headers ?? {}),
    };
  }

  /**
   * Perform an HTTP request and parse the JSON response.
   *
   * @typeParam T - The expected shape of the JSON response.
   * @param path - Relative path, e.g. "/posts/1".
   * @param options - Fetch options (method, headers, body, etc.).
   * @returns A promise that resolves to the parsed JSON response typed as `T`.
   * @throws Error if the response status is not in the 200–299 range.
   */
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildUrl(path);

    const headers = this.mergeHeaders(
      options.headers as Record<string, string> | undefined,
    );

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const text = await response.text();

    if (!response.ok) {
      // Include status and response body to help with debugging.
      throw new Error(
        `HTTP error ${response.status} ${response.statusText}: ${text}`,
      );
    }

    // Try to parse JSON; if empty, cast as unknown as T.
    if (!text) {
      return undefined as unknown as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Perform a GET request.
   *
   * @typeParam T - Expected response type.
   * @param path - Relative path, e.g. "/posts".
   * @param headers - Optional additional headers.
   */
  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, {
      method: "GET",
      headers,
    });
  }

  /**
   * Perform a POST request with a JSON body.
   *
   * @typeParam T - Expected response type.
   * @param path - Relative path.
   * @param body - Any serializable value.
   * @param headers - Optional additional headers.
   */
  post<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const mergedHeaders = {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    };

    return this.request<T>(path, {
      method: "POST",
      headers: mergedHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Perform a PUT request with a JSON body.
   */
  put<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const mergedHeaders = {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    };

    return this.request<T>(path, {
      method: "PUT",
      headers: mergedHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Perform a DELETE request.
   */
  delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
      headers,
    });
  }
}
