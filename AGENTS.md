<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Elder phone never logs in; it calls server functions in `src/lib/elder.functions.ts` with a device token checked server-side. Why: the elder must not create an account.
- Background alerts use web push (VAPID, `@pushforge/builder`, works on the Worker runtime) sent from `src/lib/push.server.ts`; `public/notify-sw.js` only handles push/notification clicks and must never cache. Why: avoid stale-preview service worker problems.
- Alert rules (which alerts, quiet hours) live in pure `src/lib/quiet-hours.ts` with tests. Why: one tested source for both the server and the UI.
- Dose and check-in alerts come from one managed schedule calling `/api/public/jobs/check-alerts`; `alerts_sent` keys make each alert send once. Why: avoid duplicate pushes.
- The AI Q&A sends the model only the family's own records (read through RLS as that user) and tells it to answer only from them. Why: answers must be grounded and private.
