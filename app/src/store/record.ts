import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "@/store/index.ts";
import { RecordData, RecordStats } from "@/api/record.ts";

type RecordProps = {
  data: RecordData;
  stats: RecordStats;
  page: number;
};

export const recordSlice = createSlice({
  name: "record",
  initialState: {
    data: {
      total: 0,
      records: [],
    },
    stats: {
      billing_today: 0,
      billing_month: 0,
      request_today: 0,
      request_month: 0,
      rpm: 0,
      tpm: 0,
    },
    page: 0,
  } as RecordProps,
  reducers: {
    setData: (state, action) => {
      state.data = action.payload;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
    setStats: (state, action) => {
      state.stats = action.payload;
    },
  },
});

export const { setData, setPage, setStats } = recordSlice.actions;
export default recordSlice.reducer;

export const dataSelector = (state: RootState) => state.record.data;
export const pageSelector = (state: RootState) => state.record.page;
export const statsSelector = (state: RootState) => state.record.stats;
