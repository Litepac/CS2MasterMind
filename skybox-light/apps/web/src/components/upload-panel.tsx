"use client";

import { useMemo, useRef, useState } from "react";
import type { MatchSummary } from "@/lib/types";

type UploadPanelProps = {
  onParsed: (summary: MatchSummary) => void;
};

export function UploadPanel({ onParsed }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLabel = useMemo(() => {
    if (!selectedDemo) {
      return {
        title: "Drop `.dem` file here",
        copy:
          "This is the first real ingest step. Choose a demo locally and push it through the internal ingest route."
      };
    }

    const sizeMb = (selectedDemo.size / 1024 / 1024).toFixed(1);
    return {
      title: selectedDemo.name,
      copy: `Ready to ingest. Local file size ${sizeMb} MB.`
    };
  }, [selectedDemo]);

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

      const summary = (await response.json()) as MatchSummary;
      onParsed(summary);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown ingest error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-line bg-panel/90 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Demo Upload
          </div>
          <h2 className="mt-2 text-xl font-bold">Local ingest queue</h2>
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
          accept=".dem"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedDemo(file);
            setError(null);
          }}
        />
      </div>

      <button
        className="mt-4 block w-full rounded-[20px] border border-dashed border-line bg-ink/70 px-6 py-8 text-center transition hover:border-accent/40 hover:bg-ink/90"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <div className="text-lg font-semibold">{selectedLabel.title}</div>
        <div className="mt-2 text-sm text-slate-400">{selectedLabel.copy}</div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {selectedDemo ? "Selected locally" : "No demo selected"}
        </div>
        {error ? <div className="text-sm text-red-300">{error}</div> : null}
      </div>
    </div>
  );
}
