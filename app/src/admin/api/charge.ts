import { CommonResponse } from "@/api/common.ts";
import { ChargeProps } from "@/admin/charge.ts";
import { getErrorMessage } from "@/utils/base.ts";
import axios from "axios";

export type ChargeListResponse = CommonResponse & {
  data: ChargeProps[];
};

export type ChargeSyncRequest = {
  overwrite: boolean;
  data: ChargeProps[];
};

export type ChargeFetchRequest = {
  endpoint: string;
  system?: string;
};

export type ChargeFetchResponse = CommonResponse & {
  data: ChargeProps[];
};

export async function listCharge(): Promise<ChargeListResponse> {
  try {
    const response = await axios.get("/admin/charge/list");
    return response.data as ChargeListResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e), data: [] };
  }
}

export async function setCharge(charge: ChargeProps): Promise<CommonResponse> {
  try {
    const response = await axios.post(`/admin/charge/set`, charge);
    return response.data as CommonResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function deleteCharge(id: number): Promise<CommonResponse> {
  try {
    const response = await axios.get(`/admin/charge/delete/${id}`);
    return response.data as CommonResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function syncCharge(
  data: ChargeSyncRequest,
): Promise<CommonResponse> {
  try {
    const response = await axios.post(`/admin/charge/sync`, data);
    return response.data as CommonResponse;
  } catch (e) {
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function fetchUpstreamCharge(
  req: ChargeFetchRequest,
): Promise<ChargeFetchResponse> {
  try {
    const response = await axios.post(`/admin/charge/fetch`, req);
    const data = response.data as ChargeFetchResponse;
    return {
      status: !!data.status,
      error: data.error,
      data: data.data || [],
    };
  } catch (e) {
    return { status: false, error: getErrorMessage(e), data: [] };
  }
}
