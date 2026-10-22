import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { config, debugLog } from "@/shared/config";
import { apiResponseBody, loginResponseModel } from "@/types";

interface credentialsRequest {
  /** Username or email — the backend accepts either for login. */
  userName: string;
  password: string;
}

interface registerRequest {
  userName: string;
  email: string;
  password: string;
  /** UI language — emails to this user are written in it. */
  language: string;
}

interface confirmEmailRequest {
  userId: string;
  token: string;
}

const baseQueryWithHeaders = fetchBaseQuery({
  baseUrl: config.API_BASE_URL,
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json');
    debugLog('Auth API Request Headers:', Object.fromEntries(headers.entries()));
    return headers;
  },
});

const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithHeaders,
  endpoints: (builder) => ({
    registerUser: builder.mutation<apiResponseBody<null>, registerRequest>({
      query: (userData) => ({
        url: config.ENDPOINTS.AUTH.REGISTER,
        method: "POST",
        body: userData,
      }),
    }),
    loginUser: builder.mutation<apiResponseBody<loginResponseModel>, credentialsRequest>({
      query: (userCredentials) => ({
        url: config.ENDPOINTS.AUTH.LOGIN,
        method: "POST",
        body: userCredentials,
      }),
    }),
    // The two values come straight from the emailed link (/confirm-email?userId&token).
    confirmEmail: builder.mutation<apiResponseBody<null>, confirmEmailRequest>({
      query: (body) => ({
        url: config.ENDPOINTS.AUTH.CONFIRM_EMAIL,
        method: "POST",
        body,
      }),
    }),
    // Always 200 (the backend does not reveal whether the account exists); 429 when rate limited.
    resendConfirmation: builder.mutation<apiResponseBody<null>, { login: string }>({
      query: (body) => ({
        url: config.ENDPOINTS.AUTH.RESEND_CONFIRMATION,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useConfirmEmailMutation,
  useResendConfirmationMutation,
} = authApi;
export default authApi;
