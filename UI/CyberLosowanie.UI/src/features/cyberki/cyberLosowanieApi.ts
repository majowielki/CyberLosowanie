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

    // GET /api/CyberLosowanie/my-available-targets - boxes the current user may still
    // safely open. Identity comes from the JWT; the server returns only choices that
    // keep the draw completable for everyone else.
    getAvailableGiftTargets: builder.query<apiResponseBody<number[]>, void>({
      query: () => ({
        url: ENDPOINTS.MY_AVAILABLE_TARGETS,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<number[]>) => {
        debugLog('Get available gift targets response:', response);
        return response;
      },
    }),

    // GET /api/CyberLosowanie/my-gifted-cyberek - Get the cyberek the current user will
    // gift to. Identity comes from the JWT — no userName parameter.
    getMyGiftedCyberek: builder.query<apiResponseBody<cyberekModel>, void>({
      query: () => ({
        url: ENDPOINTS.MY_GIFTED_CYBEREK,
      }),
      providesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<cyberekModel>) => {
        debugLog('Get my gifted cyberek response:', response);
        return response;
      },
    }),

    // POST /api/CyberLosowanie/assign-cyberek - Assign cyberek to the current user (JWT identity)
    assignCyberek: builder.mutation<apiResponseBody<null>, { cyberekId: number }>({
      query: ({ cyberekId }) => ({
        url: ENDPOINTS.ASSIGN_CYBEREK,
        method: "POST",
        body: { cyberekId },
      }),
      invalidatesTags: ["Cyberki"],
      transformResponse: (response: apiResponseBody<null>) => {
        debugLog('Cyberek assignment response:', response);
        return response;
      },
    }),

    // PUT /api/CyberLosowanie/assign-gift - Commit the box the user chose (C2-rev:
    // the user picks, the server validates). Returns ApiResponse<int> echoing the
    // accepted giftedCyberekId; 409 means the box was just taken — refresh and repick.
    assignGiftedCyberek: builder.mutation<apiResponseBody<number>, { giftedCyberekId: number }>({
      query: ({ giftedCyberekId }) => ({
        url: ENDPOINTS.ASSIGN_GIFT,
        method: "PUT",
        body: { giftedCyberekId },
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
