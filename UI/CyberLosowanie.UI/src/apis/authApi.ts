import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { config, debugLog } from "@/config";

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
    registerUser: builder.mutation({
      query: (userData) => ({
        url: config.ENDPOINTS.AUTH.REGISTER,
        method: "POST",
        body: userData,
      }),
    }),
    loginUser: builder.mutation({
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