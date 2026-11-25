import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { joinFamilyInvite, previewFamilyInvite } from "@/lib/family.functions";

export const Route = createFileRoute("/join")({
  validateSearch: z.object({ token: z.string().optional().default("") }),
  head: () => ({
    meta: [
      { title: "Join a Family Circle — FamilyCare" },
      { name: "description", content: "Join a FamilyCare circle to follow care updates and respond to SOS alerts." },
      { property: "og:title", content: "Join a Family Circle — FamilyCare" },
      { property: "og:description", content: "Join a FamilyCare circle to follow care updates and respond to SOS alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinFamily,
});

function JoinFamily() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const preview = useServerFn(previewFamilyInvite);
  const join = useServerFn(joinFamilyInvite);
  const joinAttempt = useRef("");
  const [elderName, setElderName] = useState("");
  const [inviteChecked, setInviteChecked] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const completeJoin = useCallback(async () => {
    if (!token || joinAttempt.current === token) return;
    joinAttempt.current = token;
    setBusy(true);
    setMessage("");
    try {
      const result = await join({ data: { token } });
      if (!result.ok) {
        joinAttempt.current = "";
        setMessage(result.error);
        return;
      }
      await navigate({ to: "/family", replace: true });
    } catch {
      joinAttempt.current = "";
      setMessage("We couldn't join this circle. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [join, navigate, token]);

  useEffect(() => {
    let active = true;
    if (!token) {
      setInviteChecked(true);
      return;
    }
    void preview({ data: { token } })
      .then((result) => {
        if (!active) return;
        setElderName(result.ok ? result.elderName : "");
        setInviteChecked(true);
      })
      .catch(() => {
        if (active) setInviteChecked(true);
      });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) void completeJoin();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) window.setTimeout(() => void completeJoin(), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [completeJoin, preview, token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setMessage("");
    if (mode === "up") {
      const redirectTo = `${window.location.origin}/join?token=${encodeURIComponent(token)}`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      setBusy(false);
      if (error) setMessage(error.message);
      else if (data.session) void completeJoin();
      else setMessage("Check your email to confirm your account. This invite will be ready when you return.");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
    else if (data.session) void completeJoin();
  };

  const google = async () => {
    if (!token) return;
    const redirectUri = `${window.location.origin}/join?token=${encodeURIComponent(token)}`;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
    if (result.error) setMessage("Google sign-in failed. Please try again.");
  };

  if (!inviteChecked) {
    return <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center bg-background p-6 text-foreground">Checking invite…</main>;
  }

  if (!elderName) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 bg-background p-6 text-foreground">
        <h1 className="text-3xl font-bold">Invite link unavailable</h1>
        <p className="text-muted-foreground">This link may have expired or been cancelled. Ask the profile owner for a new one.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>Back to FamilyCare</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 bg-background p-6 text-foreground">
      <h1 className="text-3xl font-bold">Join {elderName}'s Family Circle</h1>
      <p className="text-muted-foreground">Follow shared care updates and respond to SOS alerts. Only the profile owner can edit medicines.</p>
      <Button variant="outline" className="w-full" onClick={() => void google()} disabled={busy}>
        Continue with Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">or use email</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input type="email" required placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-md border-2 border-input bg-card px-4 py-3" />
        <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-md border-2 border-input bg-card px-4 py-3" />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Joining…" : mode === "in" ? "Sign in and join" : "Create account and join"}
        </Button>
      </form>
      {message && <p role="status" className="text-sm font-semibold">{message}</p>}
      <Button variant="link" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </Button>
    </main>
  );
}