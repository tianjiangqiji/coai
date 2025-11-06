import { configureStore } from "@reduxjs/toolkit";
import infoReducer from "./info";
import globalReducer from "./globals";
import menuReducer from "./menu";
import authReducer from "./auth";
import chatReducer from "./chat";
import quotaReducer from "./quota";
import packageReducer from "./package";
import subscriptionReducer from "./subscription";
import apiReducer from "./api";
import sharingReducer from "./sharing";
import settingsReducer from "./settings";
import recordReducer from "./record";
import avatarReducer from "./avatar";

const store = configureStore({
  reducer: {
    info: infoReducer,
    global: globalReducer,
    menu: menuReducer,
    auth: authReducer,
    chat: chatReducer,
    quota: quotaReducer,
    package: packageReducer,
    subscription: subscriptionReducer,
    api: apiReducer,
    sharing: sharingReducer,
    settings: settingsReducer,
    record: recordReducer,
    avatar: avatarReducer,
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

export function createCronJob(
  dispatch: AppDispatch,
  method: Function,
  interval: number,
  runWhenInit?: boolean,
) {
  if (runWhenInit) dispatch(method());
  return setInterval(() => dispatch(method()), interval * 1000);
}

export function clearCronJob(job: ReturnType<typeof setInterval>) {
  clearInterval(job);
}

export function clearCronJobs(jobs: ReturnType<typeof setInterval>[]) {
  jobs.forEach((job) => clearInterval(job));
}

export type { RootState, AppDispatch };
export default store;
