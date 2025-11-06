import { CommonResponse } from "@/api/common.ts";
import { getErrorMessage } from "@/utils/base.ts";
import axios from "axios";
import { backendEndpoint } from "@/conf/env.ts";

export type TestWebSearchResponse = CommonResponse & {
  result: string;
};

export type whiteList = {
  enabled: boolean;
  custom: string;
  whitelist: string[];
};

export type GeneralState = {
  title: string;
  logo: string;
  description: string;
  backend: string;
  docs: string;
  file: string;
  pwamanifest: string;
  gravatar: string;
  debugmode: boolean;
  realtime?: {
    ws?: {
      buffer_size?: number;
      aggregate?: boolean;
      aggregate_window_ms?: number;
    };
  };
};

export type MailState = {
  host: string;
  protocol: boolean;
  port: number;
  username: string;
  password: string;
  from: string;
  whitelist: whiteList;
};

export type SearchState = {
  endpoint: string;
  crop: boolean;
  croplen: number;
  engines: string[];
  imageproxy: boolean;
  safesearch: number;
  llm_extract: boolean;
  llm_model: string;
};

export type SecurityState = {
  check_type: string;
  check_models?: string[];

  text_database: string;
  regex_database: string;

  baidu_api_key: string;
  baidu_secretkey: string;

  custom_endpoint: string;
  custom_audit_token: string;
  
  blacklist_ips: string[];
  whitelist_ips: string[];
};

export type PaymentState = {
  stripe: {
    enabled: boolean;
    publickey: string;
    secretkey: string;
    webhooksecret: string;
  };
  epay: {
    domain: string;
    businessid: string;
    businesskey: string;
    callbackurl: string;
    enabled: boolean;
    methods: string[];
    aggregation: boolean;
    minamount: number;
  };
  wechatpay?: {
    enabled: boolean;
    app_id: string;
    mch_id: string;
    serial_no: string;
    apiv3_key: string;
    wechatcertificate: string;
  };
  xunhupay?: {
    wechat_enabled: boolean;
    alipay_enabled: boolean;
    wechat_app_id: string;
    wechat_app_secret: string;
    alipay_app_id: string;
    alipay_app_secret: string;
    endpoint: string;
  };
  affiliate?: {
    enabled: boolean;
    commissionrate: number;
    minwithdraw: number;
    allowexistingbind: boolean;
  };
};

export type SiteState = {
  closeregister: boolean;
  currency: string;
  closerelay: boolean;
  relayplan: boolean;
  quota: number;
  buylink: string;
  announcement: string;
  contact: string;
  footer: string;
  authfooter: boolean;
  pre_deduct_quota: boolean;
  hide_key_docs: boolean;
};

export type CustomState = {
  custom_js: string;
  custom_css: string;
  custom_html: string;
  ga_tracking_id: string;
};

export type AutoTitleState = {
  enabled: boolean;
  model: string;
  max_len: number;
  min_msgs: number;
  overwrite: boolean;
  prompt: string;
};

export type CommonState = {
  cache: string[];
  expire: number;
  size: number;

  article: string[];
  generation: string[];

  promptstore: boolean;
  imagestore: boolean;
};

export type SystemProps = {
  general: GeneralState;
  site: SiteState;
  mail: MailState;
  search: SearchState;
  common: CommonState;
  payment: PaymentState;
  security: SecurityState;
  custom: CustomState;
  auto_title?: AutoTitleState;
};

export type SystemResponse = CommonResponse & {
  data?: SystemProps;
};

export const initialSystemState: SystemProps = {
  general: {
    logo: "",
    description: "",
    title: "",
    backend: "",
    docs: "",
    file: "",
    pwamanifest: "",
    gravatar: "",
    debugmode: false,
    realtime: {
      ws: {
        buffer_size: 24,
        aggregate: true,
        aggregate_window_ms: 20,
      },
    },
  },
  site: {
    closeregister: false,
    currency: "cny",
    closerelay: false,
    relayplan: false,
    quota: 0,
    buylink: "",
    announcement: "",
    contact: "",
    footer: "",
    authfooter: false,
    pre_deduct_quota: true,
    hide_key_docs: false,
  },
  mail: {
    host: "",
    protocol: false,
    port: 465,
    username: "",
    password: "",
    from: "",
    whitelist: {
      enabled: false,
      custom: "",
      whitelist: [],
    },
  },
  search: {
    endpoint: "",
    crop: false,
    croplen: 1000,
    engines: [],
    imageproxy: false,
    safesearch: 0,
    llm_extract: false,
    llm_model: "",
  },
  common: {
    article: [],
    generation: [],
    cache: [],
    expire: 3600,
    size: 1,
    promptstore: false,
    imagestore: false,
  },
  payment: {
    stripe: {
      enabled: false,
      publickey: "",
      secretkey: "",
      webhooksecret: "",
    },
    epay: {
      domain: "",
      businessid: "",
      businesskey: "",
      callbackurl: "",
      enabled: false,
      methods: [],
      aggregation: false,
      minamount: 1,
    },
    affiliate: {
      enabled: false,
      commissionrate: 0.1,
      minwithdraw: 10,
      allowexistingbind: false,
    },
  },
  security: {
    check_type: "",
    check_models: [],
    text_database: "",
    regex_database: "",
    baidu_api_key: "",
    baidu_secretkey: "",
    custom_endpoint: "",
    custom_audit_token: "",
    blacklist_ips: [],
    whitelist_ips: [],
  },
  custom: {
    custom_js: "",
    custom_css: "",
    custom_html: "",
    ga_tracking_id: "",
  },
  auto_title: {
    enabled: false,
    model: "",
    max_len: 50,
    min_msgs: 6,
    overwrite: false,
    prompt: "",
  },
};

export async function getConfig(): Promise<SystemResponse> {
  try {
    const response = await axios.get("/admin/config/view");
    const data = response.data as SystemResponse;
    if (data.status && data.data) {
      // init system data pre-format

      data.data.mail.whitelist.whitelist =
        data.data.mail.whitelist.whitelist || commonWhiteList;
      data.data.search.engines = data.data.search.engines || [];
      data.data.search.croplen =
        data.data.search.croplen && data.data.search.croplen > 0
          ? data.data.search.croplen
          : 1000;

      data.data.site.currency = data.data.site.currency || "cny";

      if (data.data.payment?.epay) {
        data.data.payment.epay.methods =
          data.data.payment.epay.methods || [];
        data.data.payment.epay.minamount =
          data.data.payment.epay.minamount &&
          data.data.payment.epay.minamount > 0
            ? data.data.payment.epay.minamount
            : 1;
        data.data.payment.epay.callbackurl =
          data.data.payment.epay.callbackurl || "";
      }

      if (
        !data.data.common.group ||
        Object.keys(data.data.common.group).length === 0
      ) {
        data.data.common.group = {
          anonymous: {
            buy_price: 1,
            consume_price: 1,
            description: "",
          },
          normal: {
            buy_price: 1,
            consume_price: 1,
            description: "",
          },
          basic: {
            buy_price: 1,
            consume_price: 1,
            description: "",
          },
          standard: {
            buy_price: 1,
            consume_price: 1,
            description: "",
          },
          pro: {
            buy_price: 1,
            consume_price: 1,
            description: "",
          },
          admin: {
            buy_price: 1,
            consume_price: 1,
            description: "",
          },
        };
      }

      const rt = (data.data.general.realtime = data.data.general.realtime || {});
      const ws = (rt.ws = rt.ws || {});
      ws.buffer_size = typeof ws.buffer_size === "number" && ws.buffer_size > 0 ? ws.buffer_size : 1;
      ws.aggregate = typeof ws.aggregate === "boolean" ? ws.aggregate : true;
      ws.aggregate_window_ms = typeof ws.aggregate_window_ms === "number" && ws.aggregate_window_ms > 0 ? ws.aggregate_window_ms : 20;

      const at = (data.data.auto_title = data.data.auto_title || {
        enabled: false,
        model: "",
        max_len: 50,
        min_msgs: 6,
        overwrite: false,
        prompt: "",
      });
      at.enabled = !!at.enabled;
      at.model = at.model || "";
      at.max_len = typeof at.max_len === "number" && at.max_len > 0 ? at.max_len : 50;
      at.min_msgs = typeof at.min_msgs === "number" && at.min_msgs > 0 ? at.min_msgs : 6;
      at.overwrite = !!at.overwrite;
      at.prompt = at.prompt || "";
    }

    return data;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function setConfig(config: SystemProps): Promise<CommonResponse> {
  try {
    const response = await axios.post(`/admin/config/update`, config);
    return response.data as CommonResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

type UploadResponse = CommonResponse & {
  url?: string;
};

export async function uploadFavicon(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`/admin/favicon/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data as UploadResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function uploadResource(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`/admin/resource/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const data = response.data as UploadResponse;
    if (data.status) {
      data.url = backendEndpoint + data.url;
    }

    return data;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function updateRootPassword(
  password: string,
): Promise<CommonResponse> {
  try {
    const response = await axios.post(`/admin/user/root`, { password });
    return response.data as CommonResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function testWebSearching(
  query: string,
): Promise<TestWebSearchResponse> {
  try {
    const response = await axios.get(
      `/admin/config/test/search?query=${encodeURIComponent(query)}`,
    );
    return response.data as TestWebSearchResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e), result: "" };
  }
}

export enum AuditTypes {
  None = "none",
  Dict = "dict",
  Regex = "regex",
  Baidu = "baidu",
  Custom = "custom",
}

export const auditTypes: string[] = [
  AuditTypes.None,
  AuditTypes.Dict,
  AuditTypes.Regex,
  AuditTypes.Baidu,
  AuditTypes.Custom,
];

export const commonWhiteList: string[] = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "hotmail.com",
  "foxmail.com",
  "icloud.com",
  "qq.com",
  "163.com",
  "126.com",
];
