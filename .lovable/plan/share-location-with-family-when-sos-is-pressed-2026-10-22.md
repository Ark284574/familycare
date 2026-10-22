# Share location with family when SOS is pressed

## What changes
This changes an earlier rule. The old rule was "never use location". The new rule: location is used **only at the moment SOS is pressed** and never at any other time.

1. **Elder phone:** after the 3-second SOS hold, the phone asks once for its location.
   - If the parent allows it, the location is sent with the SOS alert.
   - If location is off, slow (more than 8 seconds) or refused, the SOS alert is still sent straight away, just without a location. Help is never delayed.
   - The screen says "Family alerted — location shared" or "Family alerted".
2. **Family dashboard:** the red SOS card shows the time, "Accurate to about X metres" and a big **Open in Google Maps** button. If there's no location it says "Location not available".
3. **"What my family can see" screen:** add "Where you are, only when you press SOS". Remove "Where you are" from the "can NOT see" list.
4. **Privacy kept:** no tracking, no location history, nothing sent at any other time. Location is stored only on that single SOS alert.

## Also fixed in this step
- Check the backend for the missing medicine and alert storage and set it up again if needed, then test the full flow: pair the phone, hold SOS, and see the location on the dashboard.
- Update the project memory: location is allowed only for SOS.

## Technical details
- Migration: add nullable `latitude`, `longitude`, `accuracy_m` (double precision) to `sos_events`. If the tables are missing, re-apply the base schema first.
- `elder.tsx` SosButton onSend: `navigator.geolocation.getCurrentPosition` with timeout 8000 and `enableHighAccuracy`, then call `sendSos` with optional coords. On error or timeout, send without coords.
- `sendSos` zod: optional lat (-90..90), lng (-180..180), accuracy; insert them.
- `family.tsx`: select the new columns and add a link `https://www.google.com/maps?q=lat,lng`.
- Update `mem://index.md` Core rule: no camera, mic or GPS except a single location read when SOS is sent.
