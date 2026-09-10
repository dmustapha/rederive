// File: web/app/page.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Graph from "../components/Graph";
import { PriceMeter, SourceEditor, Receipt, Controls } from "../components/panels";
import {
  FiveTier, DoctrineEditor, RecallPanel, CommonsPanel, TimeMachinePanel, AnchorPanel,
} from "../components/deep";
import { API, StateResp, Receipt as ReceiptT, getJSON, postJSON } from "../lib/api";

export default function Home() {
  const [state, setState] = useState<StateResp | null>(null);
  const [receipt, setReceipt] = useState<ReceiptT | null>(null);
  const [running, setRunning] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const runningRef = useRef(false);
  runningRef.current = running;

  const poll = useCallback(async () => {
    try { setState(await getJSON<StateResp>("/state")); } catch { /* keep last good state */ }
  }, []);

  // D-6: poll /state — 700ms live, widen to 1200ms while a run is in flight (DT, PLAN C4).
  useEffect(() => {
    poll();
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      poll();
      id = setTimeout(tick, runningRef.current ? 1200 : 700);
    };
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

  return (
    <main className="grid">
      <header>
        <div className="brand">
          <h1>REDERIVE</h1>
          <p>incremental compilation for cognition · built on Sibyl Memory</p>
        </div>
        {state?.demo_free && (
          <span className="badge" title="payment bypassed for the demo (honest label — MUST-NOT-CLAIM)">
            demo mode · payment bypassed — real settlement in submission/proof.md
          </span>
        )}
      </header>

      <section className="graph"><Graph state={state} onVerify={verify} /></section>

      <aside>
        <PriceMeter quote={state?.quote} dbBytes={state?.db_bytes} />
        <Controls
          running={running} onRun={run}
          onReset={() => admin("/reset")}
          onAmnesia={() => admin("/amnesia")}
          onRestore={() => admin("/amnesia", { restore: true })}
          adminToken={adminToken} setAdminToken={setAdminToken}
        />
        <SourceEditor onEdit={edit} />
        <Receipt receipt={receipt} />
        <div className="rail-divider">deep Sibyl integration · §21</div>
        <FiveTier state={state} />
        <DoctrineEditor adminToken={adminToken} onChanged={poll} />
        <RecallPanel />
        <CommonsPanel adminToken={adminToken} />
        <TimeMachinePanel adminToken={adminToken} onChanged={poll} />
        <AnchorPanel adminToken={adminToken} />
      </aside>
    </main>
  );
}
