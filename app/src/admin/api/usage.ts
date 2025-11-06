import axios from "axios";
import { getErrorMessage } from "@/utils/base.ts";

export type UsageLogData = {
  id: number;
  user_id: number;
  username: string;
  type: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  quota_cost: number;
  conversation_id: number;
  is_plan: boolean;
  amount: number;
  quota_change: number;
  subscription_level: number;
  subscription_months: number;
  detail: string;
  created_at: string;
};

export type UsageLogResponse = {
  status: boolean;
  message?: string;
  data: UsageLogData[];
  total: number;
};

export type UsageLogFilters = {
  page: number;
  username?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
};

export async function getUsageLogList(
  filters: UsageLogFilters,
): Promise<UsageLogResponse> {
  try {
    const params: Record<string, string | number> = {
      page: filters.page,
    };

    if (filters.username) {
      params.username = filters.username;
    }
    if (filters.type) {
      params.type = filters.type;
    }
    if (filters.start_date) {
      params.start_date = filters.start_date;
    }
    if (filters.end_date) {
      params.end_date = filters.end_date;
    }

    const response = await axios.get("/admin/usage/list", { params });
    return response.data as UsageLogResponse;
  } catch (e) {
    console.warn(e);
    return {
      status: false,
      message: getErrorMessage(e),
      data: [],
      total: 0,
    };
  }
}
