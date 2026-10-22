import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { pairDevice } from "@/lib/elder.functions";
import { setDeviceToken } from "@/lib/elder-store";

// Family shows a 6-digit code (or a QR that opens /pair?code=123456).
export const Route = createFileRoute("/pair")({
  // The URL may turn "424243" into a number, so accept both and keep it as text.
  validateSearch: z.object({ code: z.union([z.string(), z.number()]).transform((v) => String(v).padStart(6, "0")).optional() }),
  head: () => ({
    meta: [
      { title: "Pair this phone — FamilyCare" },
      { name: "description", content: "Link the elder's phone to family with a 6-digit code." },
      { property: "og:title", content: "Pair this phone — FamilyCare" },
      { property: "og:description", content: "Link the elder's phone to family with a 6-digit code." },
    ],
  }),
  component: PairPage,
});

function PairPage() {
  const { code: fromQr } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState(fromQr ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (c: string) => {
    setBusy(true);
    setError("");
    const r = await pairDevice({ data: { code: c } }).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDeviceToken(r.deviceToken);
    navigate({ to: "/elder" });
  };

  // Scanned a QR code: pair straight away.
  useEffect(() => {
    if (fromQr && /^\d{6}$/.test(fromQr)) void submit(fromQr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQr]);

  const press = (d: string) => setCode((c) => (d === "⌫" ? c.slice(0, -1) : c.length < 6 ? c + d : c));

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 bg-background p-6 text-foreground">
      <h1 className="text-elder-lg font-extrabold">Enter the code from your family</h1>
      <div className="flex justify-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="flex h-16 w-12 items-center justify-center rounded-xl border-4 border-foreground bg-card text-elder-lg font-bold">
            {code[i] ?? ""}
          </span>
        ))}
      </div>
      {error && <p className="text-center text-elder-sm font-bold text-destructive">{error}</p>}
      {/* Big number pad — no keyboard needed */}
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
          d ? (
            <button key={i} onClick={() => press(d)} className="rounded-2xl border-2 border-border bg-card py-5 text-elder-lg font-bold active:bg-muted">
              {d}
            </button>
          ) : <span key={i} />,
        )}
      </div>
      <button
        disabled={code.length !== 6 || busy}
        onClick={() => submit(code)}
        className="rounded-3xl bg-success py-6 text-elder-lg font-extrabold text-success-foreground disabled:opacity-40"
      >
        {busy ? "Connecting…" : "Connect"}
      </button>
    </main>
  );
}
