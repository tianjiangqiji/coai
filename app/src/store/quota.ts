import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "./index.ts";
import { getQuota } from "@/api/quota.ts";

export const quotaSlice = createSlice({
  name: "quota",
  initialState: {
    quota: 0,
  },
  reducers: {
    setQuota: (state, action) => {
      state.quota = action.payload as number;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(refreshQuota.fulfilled, (state, action) => {
      console.log(
        "[redux] receive task `refreshQuota` event: ",
        action.payload,
      );
      state.quota = action.payload as number;
    });
  },
});

export const { setQuota } = quotaSlice.actions;
export default quotaSlice.reducer;

export const quotaSelector = (state: RootState): number => state.quota.quota;

export const refreshQuota = createAsyncThunk("quota/refreshQuota", async () => {
  return await getQuota();
});
