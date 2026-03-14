"use client";

import { useEffect, useState } from "react";

type ParserReadiness = {
  ready: boolean;
  launcher: string | null;
  missing: string[];
  detail: string;
};

export function ParserReadinessPanel() {
  const [state, setState] = useState<ParserReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/parser-readiness", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load parser readiness");
        }
        const payload = (await response.json()) as ParserReadiness;
        if (active) {
          setState(payload);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown readiness error");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const statusLabel = error
    ? "Readiness unknown"
    : !state
      ? "Checking parser"
      : state.ready
        ? "DEM parser ready"
        : "DEM parser blocked";

  return (
    <div className="rounded-[20px] border border-line bg-panel/90 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Parser readiness
        </div>
        <div
          className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
            error
              ? "border-red-400/30 bg-red-400/10 text-red-200"
              : !state
                ? "border-line bg-black/20 text-slate-300"
                : state.ready
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-200"
          }`}
        >
          {statusLabel}
        </div>
      </div>

      <div className="mt-2 text-base font-bold">Local Python bridge</div>

      <div className="mt-3 rounded-[14px] border border-line bg-ink/80 p-3">
        {error ? (
          <div className="text-sm text-red-300">{error}</div>
        ) : state ? (
          <div className="space-y-2">
            <div className="text-xs text-slate-300">{state.detail}</div>
            <div className="grid gap-2">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  Launcher
                </div>
                <div className="mt-1 break-all text-xs font-semibold">{state.launcher || "None"}</div>
              </div>
              {state.missing.length ? (
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    Missing
                  </div>
                  <div className="mt-1 text-xs font-semibold">{state.missing.join(", ")}</div>
                </div>
              ) : null}
            </div>
            {!state.ready && state.missing.length ? (
              <div className="rounded-xl border border-line bg-black/20 px-3 py-2 font-mono text-[10px] text-slate-300">
                py -3 -m pip install {state.missing.join(" ")}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-slate-400">Checking the local Python runtime and required packages.</div>
        )}
      </div>
    </div>
  );
}
