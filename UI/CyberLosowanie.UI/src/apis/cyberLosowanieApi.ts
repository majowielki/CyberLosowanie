import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { config, debugLog } from "@/config";

const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: config.API_BASE_URL,
  prepareHeaders: (headers, { endpoint }) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Don't set Content-Type for FormData endpoints (if any)
    if (endpoint !== 'updateCyberek') {
      headers.set('Content-Type', 'application/json');
    }
    
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
    getCyberki: builder.query({
      query: () => ({
        url: "CyberLosowanie",
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: unknown) => {
        debugLog('Get cyberki response:', response);
        return response;
      },
    }),
    
    // GET /api/CyberLosowanie/available-to-pick - Get available cyberki to pick for current user
    getAvailableToPick: builder.query({
      query: () => ({
        url: "CyberLosowanie/available-to-pick",
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: unknown) => {
        debugLog('Get available to pick response:', response);
        return response;
      },
    }),
    
    // GET /api/CyberLosowanie/{id} - Get cyberek by ID
    getCyberekById: builder.query({
      query: (id: number) => ({
        url: `CyberLosowanie/${id}`,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: unknown) => {
        debugLog('Get cyberek by ID response:', response);
        return response;
      },
    }),
    
    // GET /api/CyberLosowanie/available-targets/{id} - Get available gift targets
    getAvailableGiftTargets: builder.query({
      query: (id: number) => ({
        url: `CyberLosowanie/available-targets/${id}`,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: unknown) => {
        debugLog('Get available gift targets response:', response);
        return response;
      },
    }),
    
    // POST /api/CyberLosowanie/assign-cyberek - Assign cyberek to user
    assignCyberek: builder.mutation({
      query: ({ cyberekId, userName }: { cyberekId: number; userName: string }) => ({
        url: `CyberLosowanie/assign-cyberek?userName=${encodeURIComponent(userName)}`,
        method: "POST",
        body: { cyberekId },
      }),
      invalidatesTags: ["Cyberki"],
      transformResponse: (response: unknown) => {
        debugLog('Cyberek assignment response:', response);
        return response;
      },
    }),
    
    // PUT /api/CyberLosowanie/assign-gift - Assign gift to user
    assignGiftedCyberek: builder.mutation({
      query: ({ giftedCyberekId, userName }: { giftedCyberekId: number; userName: string }) => ({
        url: `CyberLosowanie/assign-gift?userName=${encodeURIComponent(userName)}`,
        method: "PUT",
        body: { giftedCyberekId },
      }),
      invalidatesTags: ["Cyberki"],
      transformResponse: (response: unknown) => {
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
  useAssignCyberekMutation,
  useAssignGiftedCyberekMutation,
} = cyberLosowanieApi;
export default cyberLosowanieApi;