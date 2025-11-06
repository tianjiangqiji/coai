import axios from "axios";
import { getMemory, setMemory } from "@/utils/memory.ts";

export type Broadcast = {
  content: string;
  index: number;
};

export type BroadcastInfo = Broadcast & {
  poster: string;
  created_at: string;
};

export type BroadcastListResponse = {
  data: BroadcastInfo[];
};

export type CommonBroadcastResponse = {
  status: boolean;
  error: string;
};

export async function getRawBroadcast(): Promise<Broadcast> {
  try {
    const data = await axios.get("/broadcast/view");
    if (data.data) return data.data as Broadcast;
  } catch (e) {
    console.warn(e);
  }

  return {
    content: "",
    index: 0,
  };
}

export type BroadcastEvent = {
  message: string;
  firstReceived: boolean;
};

export async function getBroadcast(): Promise<BroadcastEvent> {
  const data = await getRawBroadcast();
  const content = data.content.trim();

  if (content.length === 0)
    return {
      message: "",
      firstReceived: false,
    };

  const memory = getMemory("broadcast");
  if (memory === content)
    return {
      message: content,
      firstReceived: false,
    };

  setMemory("broadcast", content);
  return {
    message: content,
    firstReceived: true,
  };
}

export async function getBroadcastList(): Promise<BroadcastInfo[]> {
  try {
    const resp = await axios.get("/broadcast/list");
    const data = resp.data as BroadcastListResponse;
    return data.data || [];
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export async function createBroadcast(
  content: string,
  notify_all?: boolean,
): Promise<CommonBroadcastResponse> {
  try {
    const resp = await axios.post("/broadcast/create", {
      content,
      notify_all,
    });
    return resp.data as CommonBroadcastResponse;
  } catch (e) {
    console.warn(e);
    return {
      status: false,
      error: (e as Error).message,
    };
  }
}

export async function removeBroadcast(
  index: number,
): Promise<CommonBroadcastResponse> {
  try {
    const resp = await axios.post(`/broadcast/remove/${index}`);
    return resp.data as CommonBroadcastResponse;
  } catch (e) {
    console.warn(e);
    return {
      status: false,
      error: (e as Error).message,
    };
  }
}

export async function updateBroadcast(
  id: number,
  content: string,
): Promise<CommonBroadcastResponse> {
  try {
    const resp = await axios.post("/broadcast/update", { id, content });
    return resp.data as CommonBroadcastResponse;
  } catch (e) {
    console.warn(e);
    return {
      status: false,
      error: (e as Error).message,
    };
  }
}
