import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

/**
 * Thin wrapper around Axios to keep service layer clean.
 * Centralises timeout, error logging, and future interceptors (auth, retry).
 */
export function createHttpClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 8_000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const url = err.config?.url ?? "unknown";
      const status = err.response?.status ?? "no code";
      console.error(`[HTTP] ${status} – ${url}`, err.message);
      return Promise.reject(err);
    }
  );

  return client;
}

export async function get<T>(
  client: AxiosInstance,
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const cfg: AxiosRequestConfig = params ? { params } : {};
  const { data } = await client.get<T>(path, cfg);
  return data;
}
