using System.Net;

namespace CyberLosowanie.Models
{
    public class ApiResponse<T>
    {
        public bool IsSuccess { get; set; } = true;
        public T? Data { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Errors { get; set; } = new List<string>();
        public HttpStatusCode StatusCode { get; set; } = HttpStatusCode.OK;

        public static ApiResponse<T> Success(T data, string message = "")
        {
            return new ApiResponse<T>
            {
                IsSuccess = true,
                Data = data,
                Message = message,
                StatusCode = HttpStatusCode.OK
            };
        }

        public static ApiResponse<T> Error(string message, HttpStatusCode statusCode = HttpStatusCode.BadRequest, List<string>? errors = null)
        {
            return new ApiResponse<T>
            {
                IsSuccess = false,
                Message = message,
                StatusCode = statusCode,
                Errors = errors ?? new List<string> { message }
            };
        }

        public static ApiResponse<T> ValidationError(List<string> validationErrors)
        {
            return new ApiResponse<T>
            {
                IsSuccess = false,
                Message = "Validation failed",
                StatusCode = HttpStatusCode.BadRequest,
                Errors = validationErrors
            };
        }
    }
}
