// Body returned by every backend endpoint — mirrors C# ApiResponse<T>.
export interface apiResponseBody<T = unknown> {
  isSuccess: boolean;
  data?: T;
  message: string;
  errors: string[];
  statusCode: number;
}

// Envelope returned by a non-unwrapped RTK Query mutation call:
// either `data` (HTTP 2xx body) or `error` is present.
export default interface apiResponse<T = unknown> {
  data?: apiResponseBody<T>;
  error?: {
    status?: number;
    data?: Partial<apiResponseBody<T>>;
    message?: string;
  };
}
