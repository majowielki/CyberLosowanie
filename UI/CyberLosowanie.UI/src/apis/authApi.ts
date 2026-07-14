import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { config, debugLog } from "@/config";
import { apiResponseBody, loginResponseModel } from "@/interfaces";

interface credentialsRequest {
  userName: string;
  password: string;
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
    registerUser: builder.mutation<apiResponseBody<null>, credentialsRequest>({
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
  }),
});

export const { useRegisterUserMutation, useLoginUserMutation } = authApi;
export default authApi;
