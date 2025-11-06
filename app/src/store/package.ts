import { createSlice } from "@reduxjs/toolkit";
import { getPackage } from "@/api/addition.ts";
import { AppDispatch } from "./index.ts";

export const packageSlice = createSlice({
  name: "package",
  initialState: {
    cert: false,
    teenager: false,
  },
  reducers: {
    refreshState: (state, action) => {
      state.cert = action.payload.cert;
      state.teenager = action.payload.teenager;
    },
  },
});

export const { refreshState } = packageSlice.actions;
export default packageSlice.reducer;

export const certSelector = (state: any): boolean => state.package.cert;
export const teenagerSelector = (state: any): boolean => state.package.teenager;

export const refreshPackage = async (dispatch: AppDispatch) => {
  const response = await getPackage();
  if (response.status) dispatch(refreshState(response));
};
