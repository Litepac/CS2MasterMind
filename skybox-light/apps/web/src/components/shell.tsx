import type { Route } from "next";
import Link from "next/link";
import { ReactNode } from "react";

type ShellProps = {
  children: ReactNode;
};

export function Shell({ children }: ShellProps) {
  const navItems = [
    { label: "Matches", href: "/" as Route },
    { label: "Player Stats", href: "/" as Route },
    { label: "2D Replayer", href: "/" as Route },
    { label: "Leaderboards", href: "/" as Route }
  ];

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="grid min-h-screen grid-cols-[158px_minmax(0,1fr)] xl:grid-cols-[168px_minmax(0,1fr)]">
        <aside className="border-r border-line/70 bg-black/40 p-4">
          <div className="text-[24px] font-bold leading-none tracking-tight text-accent">
            Litepac&apos;s
          </div>
          <div className="mt-1 text-[24px] font-bold leading-none tracking-tight text-white">
            Mastermind
          </div>
          <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">
            CS2 Review Suite
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  "block rounded-lg border px-3 py-2 text-[12px] font-semibold leading-tight",
                  index === 2
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-transparent text-slate-200 hover:border-line/80 hover:bg-white/5"
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="p-3 xl:p-4">{children}</main>
      </div>
    </div>
  );
}
