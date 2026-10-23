import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { config, debugLog } from "@/shared/config";
import {
  apiResponseBody,
  giftedWishlistStatusModel,
  uploadImageResponseModel,
  wishlistModel,
} from "@/types";
import { withSessionGuard } from "@/features/auth/sessionGuard";

const ENDPOINTS = config.ENDPOINTS.WISHLIST;

// Unlike cyberLosowanieApi, Content-Type is not forced here: fetchBaseQuery sets
// application/json for object bodies automatically, and the image upload needs the
// browser-generated multipart boundary (a manual header would break it).
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: config.API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const wishlistApi = createApi({
  reducerPath: "wishlistApi",
  baseQuery: withSessionGuard(baseQueryWithAuth),
  tagTypes: ["Wishlist"],
  endpoints: (builder) => ({
    // GET /api/wishlist/my — my wishlist; data null = not saved yet (normal state).
    getMyWishlist: builder.query<apiResponseBody<wishlistModel | null>, void>({
      query: () => ({
        url: ENDPOINTS.MY,
      }),
      providesTags: [{ type: "Wishlist", id: "MY" }],
      transformResponse: (response: apiResponseBody<wishlistModel | null>) => {
        debugLog("Get my wishlist response:", response);
        return response;
      },
    }),

    // PUT /api/wishlist/my — upsert: creates or overwrites the previous version.
    saveMyWishlist: builder.mutation<apiResponseBody<wishlistModel>, { canvasJson: string }>({
      query: ({ canvasJson }) => ({
        url: ENDPOINTS.MY,
        method: "PUT",
        body: { canvasJson },
      }),
      invalidatesTags: [{ type: "Wishlist", id: "MY" }],
      transformResponse: (response: apiResponseBody<wishlistModel>) => {
        debugLog("Save my wishlist response:", response);
        return response;
      },
    }),

    // POST /api/wishlist/my/send — send the saved letter to Santa, or (later)
    // notify them about changes. 409 = not saved / nothing new since the last notification.
    sendMyWishlist: builder.mutation<apiResponseBody<wishlistModel>, { note?: string }>({
      query: (body) => ({
        url: ENDPOINTS.MY_SEND,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Wishlist", id: "MY" }],
    }),

    // GET /api/wishlist/gifted — wishlist of the person I drew (read-only);
    // data null = they have not sent their letter yet; 409 = my draw is not
    // completed. Opening it marks the letter seen, so the badge status refreshes.
    getGiftedWishlist: builder.query<apiResponseBody<wishlistModel | null>, void>({
      query: () => ({
        url: ENDPOINTS.GIFTED,
      }),
      providesTags: [{ type: "Wishlist", id: "GIFTED" }],
      transformResponse: (response: apiResponseBody<wishlistModel | null>) => {
        debugLog("Get gifted wishlist response:", response);
        return response;
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(wishlistApi.util.invalidateTags([{ type: "Wishlist", id: "GIFTED_STATUS" }]));
        } catch {
          // Errors are rendered by the page; nothing to refresh.
        }
      },
    }),

    // GET /api/wishlist/gifted/status — navigation badge: is the giftee's letter
    // sent, and does it have changes I have not seen? Never 409.
    getGiftedWishlistStatus: builder.query<apiResponseBody<giftedWishlistStatusModel>, void>({
      query: () => ({
        url: ENDPOINTS.GIFTED_STATUS,
      }),
      providesTags: [{ type: "Wishlist", id: "GIFTED_STATUS" }],
    }),

    // POST /api/wishlist/my/images — multipart upload; returns the blob path to
    // reference in the canvas document. No tag invalidation: the document changes
    // only when the wishlist itself is saved.
    uploadWishlistImage: builder.mutation<apiResponseBody<uploadImageResponseModel>, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: ENDPOINTS.MY_IMAGES,
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response: apiResponseBody<uploadImageResponseModel>) => {
        debugLog("Upload wishlist image response:", response);
        return response;
      },
    }),
  }),
});

/**
 * First human-readable message out of a rejected RTK Query call — the backend
 * ApiResponse envelope carries `errors`/`message` on 4xx responses.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const body = (error as { data?: Partial<apiResponseBody> }).data;
    if (body?.errors?.length) {
      return body.errors[0];
    }
    if (body?.message) {
      return body.message;
    }
  }
  return fallback;
}

export const {
  useGetMyWishlistQuery,
  useSaveMyWishlistMutation,
  useSendMyWishlistMutation,
  useGetGiftedWishlistQuery,
  useGetGiftedWishlistStatusQuery,
  useUploadWishlistImageMutation,
} = wishlistApi;
export default wishlistApi;
