import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const cyberLosowanieApi = createApi({
  reducerPath: "cyberLosowanieApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://cyberlosowanieapi.azurewebsites.net/api/",
  }),
  tagTypes: ["Cyberki"],
  endpoints: (builder) => ({
    getCyberki: builder.query({
      query: () => ({
        url: "CyberLosowanie",
      }),
      providesTags: ["Cyberki"],
    }),
    getCyberekById: builder.query({
      query: (id) => ({
        url: `CyberLosowanie/${id}`,
      }),
      providesTags: ["Cyberki"],
    }),
    updateCyberek: builder.mutation({
      query: ({ data, userName }: { data: any; userName: string }) => ({
        url: `CyberLosowanie`,
        method: "PUT",
        params: { userName },
        body: data,
      }),
      invalidatesTags: ["Cyberki"],
    }),
    getValidateIds: builder.query({
      query: (id) => ({
        url: `CyberLosowanie/validate`,
        params: { id: `${id}` },
      }),
      providesTags: ["Cyberki"],
    }),
  }),
});

export const {
  useGetCyberkiQuery,
  useGetCyberekByIdQuery,
  useUpdateCyberekMutation,
  useGetValidateIdsQuery,
} = cyberLosowanieApi;
export default cyberLosowanieApi;