# CareCircle MVP — Build Plan

An installable phone web app with two modes (Elder and Family). Data and logins run on Lovable Cloud. Spoken reminders are in English.

## Milestone 1 — Elder screen with sample data, no backend
- One screen with no menus and no typing. Very large text, high contrast and big Morning / Afternoon / Night tiles.
- Current dose card showing the pill photo, name and dose.
- A giant "I TOOK IT" button. After a tap it shows "Done. Next medicine at 2:00 PM" and locks so the same dose can't be confirmed twice.
- Spoken reminder at dose time using the phone's built-in voice. It repeats after 10 minutes, then louder with a chime after 20 minutes.
- SOS button you hold for 3 seconds, with a filling ring and a cancel option.
- Daily "I'm okay" tap.
- "What my family can see" screen in plain language, plus a "Pause sharing" switch.
- Realistic sample medicines (for example Metformin 500mg and Amlodipine 5mg), saved on the phone so they survive a refresh.
- How to test it: open on your phone, add it to the home screen, and use a "Demo: jump to dose time" button.

## Milestone 2 — Family mode and Lovable Cloud
- Family sign up and log in with email.
- Add an elder profile, which creates a 6-digit pairing code and a QR code. The elder's phone opens /pair, enters the code and is linked with no account and no login.
- Add and edit medicines: name, dose, times, optional photo and pills remaining.
- Dashboard with a green / yellow / red status, e.g. "3 of 4 doses confirmed, last active 9:40 AM". It updates live.
- Low-stock warning when about 3 days of pills are left.
- If sharing is paused, family sees "Paused by choice" in a calm grey, with no alarm.
- Privacy rules so each family can only read its own elder's data.

## Milestone 3 — Alerts
- In-app alerts with a banner and sound on the family dashboard for only three things: dose not confirmed after a 30-minute grace period, no daily check-in by a set time, and SOS pressed.
- The word "missed" is never used, only "not confirmed".
- Browser push notifications to the family's phone when the app is closed are optional and come after the main build.

## Milestone 4 — Demo script and testing guide
- Demo: the mother taps "I TOOK IT" and the son's dashboard turns green within seconds.
- Real-device checklist covering notification permission, Android battery optimisation, add-to-home-screen and keeping the screen awake.

## Honest limitation
A web app can only speak and ring reliably while it is open on screen. Elder mode keeps the screen awake, so it is best used on a phone left on a stand or a charger. Fully offline alarms on a locked phone would need a native app later. This is worth mentioning in your project report.

## Privacy
- No GPS, camera, microphone or message access. Pill photos are added only by family, from their own device.
- Family can see only dose confirmations, last active time, check-ins and SOS events.

## Technical details
- Routes: `/` (choose mode), `/elder`, `/pair`, `/family/auth`, `/_authenticated/family` (dashboard), `/_authenticated/family/elder/$id` (medicines).
- Tables: `elders` (family_owner_id, name, pairing_code, device_token, sharing_paused, last_active_at), `family_links`, `medicines` (elder_id, name, dose, times[], photo_url, pills_remaining), `dose_events` (medicine_id, scheduled_for, confirmed_at, unique per dose, which blocks double confirmation), `checkins`, `sos_events`.
- RLS: family members access only elders linked to them. The elder device acts through server functions that check its device token.
- Text-to-speech: browser speechSynthesis (en-IN), plus the Wake Lock API and a web manifest so the app can be installed.
- Storage bucket for pill photos. Realtime updates for the dashboard.
- Design: warm high-contrast palette, a large readable font with an 28px+ minimum in elder mode, and 64px+ tap targets.
