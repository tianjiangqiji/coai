import axios from "axios";
import { CommonResponse } from "@/api/common.ts";
import { getErrorMessage } from "@/utils/base.ts";

export type EpayInfoResponse = CommonResponse & {
  enabled: boolean;
  minamount: number;
  methods: string[];
  aggregation: boolean;
};

export async function getEpayInfo(): Promise<EpayInfoResponse> {
  try {
    const response = await axios.get("/payment/epay/info");
    return response.data as EpayInfoResponse;
  } catch (e) {
    return {
      status: false,
      error: getErrorMessage(e),
      enabled: false,
      minamount: 1,
      methods: [],
      aggregation: false,
    };
  }
}

export type CreateEpayOrderPayload = {
  amount: number;
  method?: string;
  return_url: string;
  device?: string;
};

export type CreateEpayOrderResponse = CommonResponse & {
  pay_url?: string;
  order_no?: string;
  amount?: number;
  method?: string;
};

export async function createEpayOrder(
  payload: CreateEpayOrderPayload,
): Promise<CreateEpayOrderResponse> {
  try {
    const response = await axios.post("/payment/epay/create", payload);
    return response.data as CreateEpayOrderResponse;
  } catch (e) {
    return {
      status: false,
      error: getErrorMessage(e),
    };
  }
}

export type EpayOrderStatusResponse = CommonResponse & {
  order_status?: string;
  paid_at?: string;
  trade_no?: string;
};

export async function getEpayOrderStatus(
  orderNo: string,
): Promise<EpayOrderStatusResponse> {
  try {
    const response = await axios.get(`/payment/epay/order/${orderNo}`);
    return response.data as EpayOrderStatusResponse;
  } catch (e) {
    return {
      status: false,
      error: getErrorMessage(e),
    };
  }
}
