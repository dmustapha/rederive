// File: web/lib/useReport.ts — polls /report (rich, human-labeled dossier) + drives edit/run.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getJSON, postJSON } from "./api";
export type ReportNode = { id: string; label: string; stage: "source"|"extract"|"metric"|"verdict"; verdict: string; verified?: string|null; value: any; fp?: string|null };
export type ReportResp = { nodes: ReportNode[]; edges: [string,string][]; quote: { total_usd: number; derived_count: number; reused_count: number; items?: {node:string}[] }; demo_free?: boolean; memory?: { records: number; expected: number; db_bytes: number } };
export type Receipt = { derived: string[]; reused: string[]; cutoff?: string[]; quoted_usd?: number };
export function useReport() {
  const [rep, setRep] = useState<ReportResp | null>(null);
  const [running, setRunning] = useState(false);
  const [cone, setCone] = useState<string[]>([]);       // ids the last edit invalidated
  const [token] = useState(process.env.NEXT_PUBLIC_DEMO_ADMIN_TOKEN ?? "");
  const runRef = useRef(false); runRef.current = running;
  const poll = useCallback(async () => { try { setRep(await getJSON<ReportResp>("/report")); } catch {} }, []);
  useEffect(() => { poll(); let id: any; const t=()=>{poll();id=setTimeout(t,runRef.current?1200:900)}; id=setTimeout(t,900); return ()=>clearTimeout(id); }, [poll]);
  const edit = async (source: string, content: string) => {
    const j = await postJSON<{ invalidated: string[] }>("/edit", { source, content }, token);
    setCone(j.invalidated ?? []); poll(); return j.invalidated ?? [];
  };
  // returns the REAL receipt (which nodes recomputed vs reused) so the UI can animate actual work
  const run = async (): Promise<Receipt | null> => {
    setRunning(true);
    try { const j = await postJSON<{ receipt: Receipt }>("/answer", {}); return j?.receipt ?? null; }
    finally { setRunning(false); setCone([]); poll(); }
  };
  const admin = async (path: string, body: unknown = {}) => { await postJSON(path, body, token); setCone([]); poll(); };
  return { rep, running, cone, token, poll, edit, run, admin };
}
