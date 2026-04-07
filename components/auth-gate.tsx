"use client";

import clsx from "clsx";
import { startTransition, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
};

export function AuthGate({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function submit() {
    setPending(true);
    setError("");

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Something went wrong");
      return;
    }

    startTransition(() => onAuthenticated(payload.user));
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-neutral">
          FinBoard AI
        </div>
        <div className="space-y-4">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-5xl">
            Financial board đủ gọn để mở mỗi ngày, đủ sâu để quay lại mỗi khi nghĩ tới market.
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-300">
            Morning brief, scanner, prediction band, invalidation, và chatbox đều nằm trên một màn hình. Đăng nhập để giữ workspace cá nhân và biến FinBoard AI thành home base cho daily market ritual.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            "Daily ritual card trước giờ mở cửa",
            "Signal scanner ưu tiên swing 5 ngày",
            "Chatboard để hỏi nhanh theo ticker"
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-200 transition hover:-translate-y-0.5 hover:border-signal/40 hover:bg-white/[0.05]"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0d1523]/90 p-6 shadow-cyan backdrop-blur">
        <div className="mb-6 flex gap-2 rounded-2xl bg-white/[0.04] p-1">
          {(["login", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={clsx(
                "flex-1 rounded-xl px-4 py-2 text-sm transition",
                mode === value ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              {value === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "signup" ? (
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-signal/40"
                placeholder="YC"
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Email</span>
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-signal/40"
              placeholder="you@finboard.ai"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-signal/40"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-sm text-bear">{error}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:-translate-y-0.5 hover:bg-signal disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Please wait..." : mode === "login" ? "Log in to FinBoard AI" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
