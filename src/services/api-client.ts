import { requireApiData } from "@/src/lib/api-client";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function requestApi<T>(
  url: string,
  init: RequestInit,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiResponse<T>;
  return requireApiData(response, payload, fallbackMessage);
}
