import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FamilyCare — Gentle medicine reminders for elders" },
      { name: "description", content: "FamilyCare helps elders take medicines on time and lets family check in without tracking." },
      { property: "og:title", content: "FamilyCare — Gentle medicine reminders for elders" },
      { property: "og:description", content: "Big, simple reminders for elders. Calm, private check-ins for family." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 bg-background p-6 text-foreground">
      <div>
        <HeartHandshake className="h-14 w-14 text-primary" strokeWidth={2.5} />
        <h1 className="mt-3 text-elder-xl font-extrabold">FamilyCare</h1>
        <p className="mt-2 text-elder-sm text-muted-foreground">Medicines on time. Family at peace. Privacy kept.</p>
      </div>
      <Link to="/elder" className="rounded-3xl bg-success p-8 text-center text-elder-lg font-extrabold text-success-foreground shadow-lg">
        I am the Elder
      </Link>
      <Link to="/family" className="flex items-center gap-4 rounded-3xl border-4 border-primary bg-card p-6">
        <Users className="h-10 w-10 text-primary" />
        <div>
          <p className="text-elder-sm font-bold">I am Family</p>
          <p className="text-base text-muted-foreground">Sign in, add medicines, pair the phone, see today's status.</p>
        </div>
      </Link>
    </main>
  );
}
