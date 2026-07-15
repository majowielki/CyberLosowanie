import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { config, debugLog } from "@/shared/config";
import { apiResponseBody, cyberekModel } from "@/types";

const ENDPOINTS = config.ENDPOINTS.CYBER_LOSOWANIE;

const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: config.API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');

    debugLog('API Request Headers:', Object.fromEntries(headers.entries()));
    return headers;
  },
});

const cyberLosowanieApi = createApi({
  reducerPath: "cyberLosowanieApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Cyberki"],
  endpoints: (builder) => ({
    // GET /api/CyberLosowanie - Get all cyberki
    getCyberki: builder.query<apiResponseBody<cyberekModel[]>, void>({
      query: () => ({
        url: ENDPOINTS.BASE,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<cyberekModel[]>) => {
        debugLog('Get cyberki response:', response);
        return response;
      },
    }),

    // GET /api/CyberLosowanie/available-to-pick - Get available cyberki to pick for current user
    getAvailableToPick: builder.query<apiResponseBody<cyberekModel[]>, void>({
      query: () => ({
        url: ENDPOINTS.AVAILABLE_TO_PICK,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<cyberekModel[]>) => {
        debugLog('Get available to pick response:', response);
        return response;
      },
    }),

    // GET /api/CyberLosowanie/{id} - Get cyberek by ID
    getCyberekById: builder.query<apiResponseBody<cyberekModel>, number>({
      query: (id) => ({
        url: `${ENDPOINTS.BASE}/${id}`,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<cyberekModel>) => {
        debugLog('Get cyberek by ID response:', response);
        return response;
      },
    }),

    // GET /api/CyberLosowanie/available-targets/{id} - Get available gift targets
    getAvailableGiftTargets: builder.query<apiResponseBody<number[]>, number>({
      query: (id) => ({
        url: `${ENDPOINTS.AVAILABLE_TARGETS}/${id}`,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<number[]>) => {
        debugLog('Get available gift targets response:', response);
        return response;
      },
    }),

    // GET /api/CyberLosowanie/my-gifted-cyberek - Get the cyberek the current user will gift to
    getMyGiftedCyberek: builder.query<apiResponseBody<cyberekModel>, string>({
      query: (userName) => ({
        url: `${ENDPOINTS.MY_GIFTED_CYBEREK}?userName=${encodeURIComponent(userName)}`,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<cyberekModel>) => {
        debugLog('Get my gifted cyberek response:', response);
        return response;
      },
    }),

    // POST /api/CyberLosowanie/assign-cyberek - Assign cyberek to user
    assignCyberek: builder.mutation<apiResponseBody<null>, { cyberekId: number; userName: string }>({
      query: ({ cyberekId, userName }) => ({
        url: `${ENDPOINTS.ASSIGN_CYBEREK}?userName=${encodeURIComponent(userName)}`,
        method: "POST",
        body: { cyberekId },
      }),
      invalidatesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<null>) => {
        debugLog('Cyberek assignment response:', response);
        return response;
      },
    }),

    // PUT /api/CyberLosowanie/assign-gift - Run the server-side draw for the user.
    // The client does not pick a target (C2); the server draws it and returns
    // ApiResponse<int> where data is the assigned giftedCyberekId.
    assignGiftedCyberek: builder.mutation<apiResponseBody<number>, { userName: string }>({
      query: ({ userName }) => ({
        url: `${ENDPOINTS.ASSIGN_GIFT}?userName=${encodeURIComponent(userName)}`,
        method: "PUT",
      }),
      invalidatesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<number>) => {
        debugLog('Gifted cyberek assignment response:', response);
        return response;
      },
    }),
  }),
});

export const {
  useGetCyberkiQuery,
  useGetCyberekByIdQuery,
  useGetAvailableToPickQuery,
  useGetAvailableGiftTargetsQuery,
  useGetMyGiftedCyberekQuery,
  useAssignCyberekMutation,
  useAssignGiftedCyberekMutation,
} = cyberLosowanieApi;
export default cyberLosowanieApi;
