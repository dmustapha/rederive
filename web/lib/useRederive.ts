// File: web/lib/useRederive.ts
// Shared live-state hook: /state polling + the mutation actions. Landing uses it read-only
// (state for the showcase graph + live price); console uses the full action set.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { StateResp, Receipt as ReceiptT, getJSON, postJSON } from "./api";

export function useRederive() {
  const [state, setState] = useState<StateResp | null>(null);
  const [receipt, setReceipt] = useState<ReceiptT | null>(null);
  const [running, setRunning] = useState(false);
  // On the public demo deploy, NEXT_PUBLIC_DEMO_ADMIN_TOKEN pre-fills the token so judges can
  // drive the hero flow (edit → watch the cone), amnesia/deletion-test, and doctrine directly.
  const [adminToken, setAdminToken] = useState(process.env.NEXT_PUBLIC_DEMO_ADMIN_TOKEN ?? "");
  const runningRef = useRef(false);
  runningRef.current = running;

  const poll = useCallback(async () => {
    try { setState(await getJSON<StateResp>("/state")); } catch { /* keep last good state */ }
  }, []);

  // D-6: poll /state — 700ms live, widen to 1200ms while a run is in flight.
  useEffect(() => {
    poll();
    let id: ReturnType<typeof setTimeout>;
    const tick = () => { poll(); id = setTimeout(tick, runningRef.current ? 1200 : 700); };
    id = setTimeout(tick, 700);
    return () => clearTimeout(id);
  }, [poll]);

  const run = async () => {
    setRunning(true);
    try {
      const j = await postJSON<{ receipt?: ReceiptT }>("/answer", {});
      setReceipt(j.receipt ?? null);
    } catch { /* surfaced via unchanged graph */ }
    finally { setRunning(false); poll(); }
  };

  const edit = async (source: string, content: string): Promise<string[]> => {
    const j = await postJSON<{ invalidated: string[] }>("/edit", { source, content }, adminToken);
    poll();
    return j.invalidated ?? [];
  };

  const verify = async (node: string): Promise<string> => {
    const j = await postJSON<{ verdict: string }>("/verify", { node });
    poll();
    return j.verdict;
  };

  const admin = async (path: string, body: unknown = {}) => {
    await postJSON(path, body, adminToken);
    setReceipt(null); poll();
  };

  return { state, receipt, running, adminToken, setAdminToken, poll, run, edit, verify, admin };
}
