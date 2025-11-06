import { Plan, Plans } from "@/api/types.tsx";

export const subscriptionType: Record<number, string> = {
  1: "basic",
  2: "standard",
  3: "pro",
};

export function getPlan(data: Plans, level: number): Plan {
  const raw = data.filter((item) => item.level === level);
  return raw.length > 0 ? raw[0] : { level: 0, price: 0, items: [] };
}

export function getPlanModels(data: Plans, level: number): string[] {
  return getPlan(data, level).items.flatMap((item) => item.models);
}

export function includingModelFromPlan(
  data: Plans,
  level: number,
  model: string,
): boolean {
  return getPlanModels(data, level).includes(model);
}

export function getPlanPrice(data: Plans, level: number): number {
  return getPlan(data, level).price;
}

export function getPlanName(level: number): string {
  return subscriptionType[level] || "none";
}
