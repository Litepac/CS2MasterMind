"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchSummary } from "@/lib/types";

type IngestJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  detail?: string;
  summary?: MatchSummary;
};

type IngestResponse =
  | { mode: "completed"; job: IngestJob; summary: MatchSummary }
  | { mode: "queued"; job: IngestJob };

type UploadPanelProps = {
  onParsed: (summary: MatchSummary) => void;
};

export function UploadPanel({ onParsed }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<IngestJob | null>(null);

  const selectedLabel = useMemo(() => {
    if (!selectedDemo) {
      return {
        title: "Drop `.dem` or `.viewer.json` here",
        copy:
          "Use `.viewer.json` for the most reliable path right now. Every upload is copied into `skybox-light/incoming-demos` before parsing."
      };
    }

    const sizeMb = (selectedDemo.size / 1024 / 1024).toFixed(1);
    return {
      title: selectedDemo.name,
      copy: `Ready to ingest. Local file size ${sizeMb} MB. A stable copy will be stored in skybox-light/incoming-demos.`
    };
  }, [selectedDemo]);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/ingest/${job.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as IngestJob;
        setJob(next);

        if (next.status === "completed" && next.summary) {
          onParsed(next.summary);
          setLoading(false);
        }

        if (next.status === "failed") {
          setError(next.detail || next.error || "Parsing failed");
          setLoading(false);
        }
      } catch {
        // Keep polling until status is terminal.
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [job, onParsed]);

  async function handleParse() {
    if (!selectedDemo) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("demo", selectedDemo);

      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Ingest failed");
      }

      const payload = (await response.json()) as IngestResponse;

      if (payload.mode === "completed") {
        setJob(payload.job);
        onParsed(payload.summary);
        setLoading(false);
        return;
      }

      setJob(payload.job);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown ingest error");
      setJob(null);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-line bg-panel/90 p-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Demo Upload
          </div>
          <h2 className="mt-1 text-lg font-bold">Local ingest queue</h2>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            Select Demo
          </button>
          <button
            className="rounded-lg border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!selectedDemo || loading}
            onClick={handleParse}
            type="button"
          >
            {loading ? "Parsing..." : "Parse Demo"}
          </button>
        </div>
        <input
          ref={inputRef}
          hidden
          accept=".dem,.json,.viewer.json"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedDemo(file);
            setError(null);
          }}
        />
      </div>

      <button
        className="mt-3 block w-full rounded-[16px] border border-dashed border-line bg-ink/70 px-4 py-6 text-center transition hover:border-accent/40 hover:bg-ink/90"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <div className="text-base font-semibold">{selectedLabel.title}</div>
        <div className="mt-2 text-xs text-slate-400">{selectedLabel.copy}</div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
          {job && job.status !== "completed" && job.status !== "failed"
            ? `Job ${job.status}`
            : selectedDemo
              ? "Stored in incoming-demos on ingest"
              : "No demo selected"}
        </div>
        {error ? <div className="max-w-[65%] text-xs text-red-300">{error}</div> : null}
      </div>
    </div>
  );
}
