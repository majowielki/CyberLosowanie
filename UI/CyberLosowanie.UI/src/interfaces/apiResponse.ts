export default interface apiResponse<T = unknown> {
    // RTK Query success response - contains your C# ApiResponse structure
    data?: {
      isSuccess: boolean;
      data?: T;
      message: string;
      errors: string[];
      statusCode: number;
    };
    // RTK Query error response - can be various formats
    error?: {
      status?: number;
      data?: {
        isSuccess?: boolean;
        message?: string;
        errors?: string[];
        statusCode?: number;
      };
      message?: string;
    };
  }
  