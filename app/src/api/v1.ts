import axios from "axios";
import { Model, Plan } from "@/api/types.tsx";
import { ChargeProps, nonBilling } from "@/admin/charge.ts";
import { getErrorMessage } from "@/utils/base.ts";

type v1Options = {
  endpoint?: string;
};

type v1Models = {
  object: string;
  data: v1ModelItem[];
};

type v1ModelItem =
  | string
  | {
      id: string;
      object: string;
      created: number;
      owned_by: string;
    };

type v1Resp<T> = {
  data: T;
  status: boolean;
  error?: string;
};

export type v1ApiKey = {
  id: number;
  user_id?: number;
  name: string;
  expired_at: string;
  quota: number;
  used_quota: number;
  infinite_quota: boolean;
  ip_whitelist: string;
  model_whitelist: string;
  token_group?: string;
  group_id?: string;
  api_key?: string;
  disabled: boolean;
  created_at?: string;
};

export const initialApiKey: v1ApiKey = {
  id: -1,
  name: "",
  expired_at: "1970-01-01 00:00:00",
  quota: 100.0,
  used_quota: 0,
  infinite_quota: false,
  ip_whitelist: "",
  model_whitelist: "",
  token_group: "default",
  disabled: false,
};

export function getModelName(id: string): string {
  // replace all `-` to ` ` except first `-` keep it
  let begin = true;

  return id
    .replace(/-/g, (l) => {
      if (begin) {
        begin = false;
        return l;
      }
      return " ";
    })
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Gpt/g, "GPT")
    .replace(/Tts/g, "TTS")
    .replace(/Dall-E/g, "DALL-E")
    .replace(/Dalle/g, "DALLE")
    .replace(/Glm/g, "GLM")
    .trim();
}

export function getV1Path(path: string, options?: v1Options): string {
  let endpoint = options && options.endpoint ? options.endpoint : "";
  if (endpoint.endsWith("/")) endpoint = endpoint.slice(0, -1);

  return endpoint + path;
}

export async function getApiModels(
  secret?: string,
  options?: v1Options,
): Promise<v1Resp<string[]>> {
  try {
    const res = await axios.get(
      getV1Path("/v1/models", options),
      secret
        ? {
            headers: {
              Authorization: `Bearer ${secret}`,
            },
          }
        : undefined,
    );

    const data = res.data as v1Models;

    // if data.data is an array of strings, we can just return it

    const models = data.data
      ? data.data.map((model) => (typeof model === "string" ? model : model.id))
      : [];

    return models.length > 0
      ? { status: true, data: models }
      : { status: false, data: [], error: "No models found" };
  } catch (e) {
    console.warn(e);
    return { status: false, data: [], error: getErrorMessage(e) };
  }
}

export async function getApiPlans(options?: v1Options): Promise<Plan[]> {
  try {
    const res = await axios.get(getV1Path("/v1/plans", options));
    const plans = res.data as Plan[];
    return plans.filter((plan: Plan) => plan.level !== 0);
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export async function getApiMarket(options?: v1Options): Promise<Model[]> {
  try {
    const res = await axios.get(getV1Path("/v1/market", options));
    return (res.data || []) as Model[];
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export async function getFilledApiMarket(
  secret?: string,
  options?: v1Options,
): Promise<Model[]> {
  const data = await getApiMarket(options);
  if (data.length > 0) return data;

  const resp = await getApiModels(secret, options);
  if (!resp.status) return [];

  return resp.data.map((id) => ({
    id,
    default: true,
    name: getModelName(id),
    tag: [],
    avatar: "",
    description: id,
    free: false,
    auth: true,
    high_context: false,
    price: {
      type: nonBilling,
      anonymous: false,
      models: [id],
      input: 0,
      output: 0,
    },
  }));
}

export async function bindMarket(options?: v1Options): Promise<Model[]> {
  const market = await getFilledApiMarket(undefined, options);
  const charge = await getApiCharge(options);

  market.forEach((item: Model) => {
    const instance = charge.find((i: ChargeProps) =>
      i.models.includes(item.id),
    );
    if (!instance) return;

    item.free = instance.type === nonBilling;
    item.auth = !item.free || !instance.anonymous;
    item.price = { ...instance };
  });

  return market;
}

export async function getApiCharge(
  options?: v1Options,
): Promise<ChargeProps[]> {
  try {
    const res = await axios.get(getV1Path("/v1/charge", options));
    return res.data as ChargeProps[];
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export async function listApiKey(
  options?: v1Options,
): Promise<v1Resp<v1ApiKey[]>> {
  try {
    const res = await axios.get(getV1Path("/v1/list_keys", options));
    return res.data as v1Resp<v1ApiKey[]>;
  } catch (e) {
    console.warn(e);
    return { status: false, data: [], error: getErrorMessage(e) };
  }
}

export async function updateApiKey(
  data: v1ApiKey,
  options?: v1Options,
): Promise<v1Resp<v1ApiKey>> {
  try {
    const res = await axios.post(getV1Path("/v1/update_key", options), data);
    return res.data as v1Resp<v1ApiKey>;
  } catch (e) {
    console.warn(e);
    return { status: false, data: initialApiKey, error: getErrorMessage(e) };
  }
}

export async function deleteApiKey(
  id: number,
  options?: v1Options,
): Promise<v1Resp<v1ApiKey>> {
  try {
    const res = await axios.post(getV1Path(`/v1/delete_key?id=${id}`, options));
    return res.data as v1Resp<v1ApiKey>;
  } catch (e) {
    console.warn(e);
    return { status: false, data: initialApiKey, error: getErrorMessage(e) };
  }
}

type ManifestJson = {
  data?: Record<
    string,
    {
      file: string;
      src: string;
    }
  >;
  status: boolean;
  error?: string;
};

export async function getManifestJson(): Promise<ManifestJson> {
  try {
    const res = await axios.get("/manifest.json", {
      baseURL: "/",
    });
    return {
      status: true,
      data: res.data,
    };
  } catch (e) {
    console.warn(e);
    return {
      status: false,
      error: getErrorMessage(e),
    };
  }
}
