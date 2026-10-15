import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Family sign in — FamilyCare" },
      { name: "description", content: "Sign in to set up medicines and check in on your parent." },
      { property: "og:title", content: "Family sign in — FamilyCare" },
      { property: "og:description", content: "Sign in to set up medicines and check in on your parent." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in? Go to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/family" }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: "/family" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/family" } });
      setMsg(error ? error.message : "Check your email and click the link to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg("Google sign-in failed. Please try again.");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 bg-background p-6 text-foreground">
      <h1 className="text-3xl font-bold">{mode === "in" ? "Family sign in" : "Create family account"}</h1>
      <button onClick={google} className="rounded-lg border-2 border-border bg-card py-3 font-semibold">Continue with Google</button>
      <p className="text-center text-sm text-muted-foreground">or</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border-2 border-input bg-card px-4 py-3" />
        <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border-2 border-input bg-card px-4 py-3" />
        <button disabled={busy} className="rounded-lg bg-primary py-3 font-bold text-primary-foreground">{mode === "in" ? "Sign in" : "Sign up"}</button>
      </form>
      {msg && <p className="text-sm font-semibold">{msg}</p>}
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-sm underline">
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
