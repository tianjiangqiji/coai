import axios from "axios";
import {
  setAppLogo,
  setAppName,
  setBlobEndpoint,
  setBuyLink,
  setDocsUrl,
} from "@/conf/env.ts";
import { infoEvent } from "@/events/info.ts";
import { initGoogleAnalytics } from "@/utils/analytics.ts";
import { BroadcastEvent, getBroadcast } from "@/api/broadcast";

export type SiteInfo = {
  title: string;
  logo: string;
  docs: string;
  file: string;
  backend?: string;
  currency: string;
  announcement: string;
  buylink: string;
  mail: boolean;
  contact: string;
  footer: string;
  authfooter: boolean;
  hide_key_docs?: boolean;
  article: string[];
  generation: string[];
  relayplan: boolean;
  payment: string[];
  payment_aggregation: boolean;
  ga_tracking_id?: string;
  broadcast?: BroadcastEvent;
};

export async function getSiteInfo(): Promise<SiteInfo> {
  try {
    const response = await axios.get("/info");
    return response.data as SiteInfo;
  } catch (e) {
    console.warn(e);
    return {
      title: "",
      logo: "",
      docs: "",
      file: "",
      backend: undefined,
      currency: "cny",
      announcement: "",
      buylink: "",
      contact: "",
      footer: "",
      authfooter: false,
      hide_key_docs: false,
      mail: false,
      article: [],
      generation: [],
      relayplan: false,
      payment: [],
      payment_aggregation: false,

      broadcast: {
        message: "",
        firstReceived: false,
      },
    };
  }
}

export function syncSiteInfo() {
  setTimeout(async () => {
    const info = await getSiteInfo();
    info.broadcast = await getBroadcast();

    setAppName(info.title);
    setAppLogo(info.logo);
    setDocsUrl(info.docs);
    setBlobEndpoint(info.file);
    setBuyLink(info.buylink);
    initGoogleAnalytics(info.ga_tracking_id);

    infoEvent.emit(info);
  }, 25);
}
