import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { config, debugLog } from "@/shared/config";
import { apiResponseBody, wishlistModel, uploadImageResponseModel } from "@/types";

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
  baseQuery: baseQueryWithAuth,
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

    // GET /api/wishlist/gifted — wishlist of the person I drew (read-only);
    // data null = they have not saved one yet; 409 = my draw is not completed.
    getGiftedWishlist: builder.query<apiResponseBody<wishlistModel | null>, void>({
      query: () => ({
        url: ENDPOINTS.GIFTED,
      }),
      providesTags: [{ type: "Wishlist", id: "GIFTED" }],
      transformResponse: (response: apiResponseBody<wishlistModel | null>) => {
        debugLog("Get gifted wishlist response:", response);
        return response;
      },
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
  useGetGiftedWishlistQuery,
  useUploadWishlistImageMutation,
} = wishlistApi;
export default wishlistApi;
