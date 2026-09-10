// File: web/lib/api.ts
// Single source of truth for the live API. Every panel goes through here — no mock data.
export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8402";

export type Verdict =
  | "source" | "pending" | "stored" | "derived"
  | "reused" | "cutoff" | "error" | "invalidated";

export interface StateResp {
  nodes: { id: string; verdict: Verdict; fp: string | null; verified?: "MATCH" | "MISMATCH" | null }[];
  edges: [string, string][];
  quote: QuoteResp;
  db_bytes: number;
  demo_free: boolean;
}
export interface QuoteResp {
  total_usd: number;
  derived_count: number;
  reused_count: number;
  items: { node: string; unit_usd: number }[];
}
export interface Receipt {
  derived: string[]; reused: string[]; cutoff?: string[];
  quoted_usd?: number; total_usd?: number;
}

const json = (adminToken?: string): Record<string, string> => ({
  "content-type": "application/json",
  ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
});

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

export async function postJSON<T>(path: string, body: unknown = {}, adminToken?: string): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST", headers: json(adminToken), body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any)?.detail ?? `${path} → ${r.status}`);
  return data as T;
}
