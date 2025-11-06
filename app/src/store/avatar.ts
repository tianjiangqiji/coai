import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AvatarState {
  avatars: Record<string, Blob | null>;
}

const initialState: AvatarState = {
  avatars: {},
};

const avatarSlice = createSlice({
  name: "avatar",
  initialState,
  reducers: {
    setAvatar: (
      state,
      action: PayloadAction<{ username: string; blob: Blob | null }>,
    ) => {
      state.avatars[action.payload.username] = action.payload.blob;
    },
  },
});

export const { setAvatar } = avatarSlice.actions;

export default avatarSlice.reducer;
