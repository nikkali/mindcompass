# MindCompass

MindCompass is a discipleship-first "Mind GPS" that guides followers of Jesus through gentle daily check-ins, Scripture-rooted routes, and privacy-first journaling. This prototype focuses on the MVP flow: check in, place your mind pin, select a Christ-centered destination, and capture the route in a private journal.

## Features

- **Check-in flow** — Log how you're feeling with text or optional voice capture.
- **Mind compass** — Lightweight sentiment cues rotate the compass needle and offer reflective insights.
- **Destination routes** — Select Peace, Truth, Hope, Joy, or Courage to receive Scripture, guided prayer prompts, and a tiny obedience step.
- **Step tracking** — Mark each prompt as complete before saving the journey.
- **Private journal** — Entries are encrypted before being stored locally, and a local-only toggle keeps every interaction on-device.

## Getting started

1. Open `index.html` in your browser (no build tooling required).
2. Log a feeling with the quick check-in form.
3. Choose a destination to receive a 3-step route anchored in God’s Word.
4. Check off each prompt and save to your journal.

Voice capture uses the browser’s Web Speech API. If you prefer to stay fully on-device, enable **Local-only mode** in the header to disable voice capture entirely.

## Privacy notes

- Journal entries are encrypted client-side with a key that never leaves the browser. For this prototype the key is persisted in local storage so entries remain readable between sessions.
- Toggling **Local-only mode** keeps MindCompass from accessing network-enabled voice transcription, ensuring the prototype remains offline-first.
- All data lives in your browser storage. Clearing the site data will remove journal entries permanently.

## Design language

MindCompass leans into a calm, minimal aesthetic inspired by gentle neutrals, soft greens, and muted blues. Typography mixes Inter for clarity with Lora for warmth. Subtle cards, whitespace, and Scripture-first content keep the experience pastoral rather than clinical.
