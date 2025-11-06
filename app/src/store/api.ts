import { createSlice } from "@reduxjs/toolkit";
import { getKey, regenerateKey } from "@/api/addition.ts";
import { AppDispatch, RootState } from "./index.ts";

export const apiSlice = createSlice({
  name: "api",
  initialState: {
    key: "",
  },
  reducers: {
    setKey: (state, action) => {
      state.key = action.payload as string;
    },
  },
});

export const { setKey } = apiSlice.actions;
export default apiSlice.reducer;

export const keySelector = (state: RootState): string => state.api.key;

export const getApiKey = async (dispatch: AppDispatch, retries?: boolean) => {
  const response = await getKey();
  if (response.status) {
    if (response.key.length === 0 && retries !== false) {
      await getApiKey(dispatch, false);
      return;
    }
    dispatch(setKey(response.key));
  }
};

export const regenerateApiKey = async (dispatch: AppDispatch) => {
  const response = await regenerateKey();
  if (response.status) {
    dispatch(setKey(response.key));
  }

  return response;
};
