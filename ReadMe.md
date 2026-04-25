# TwinMind Live Suggestions

A real-time AI meeting copilot that transcribes your mic, surfaces 3 contextual suggestions every ~30 seconds, and answers questions in a live chat panel.

**Live demo:** https://twinmind-six.vercel.app

---

## Quick start

```bash
npm install
npm run dev
# Open http://localhost:3000
# Paste your Groq API key in Settings → Save
# Click "Start Recording"
```

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | API routes + React in one repo; easy Vercel deploy |
| Language | TypeScript | Catches shape mismatches in Groq response parsing early |
| Styling | Tailwind CSS | Fast, no CSS files, dark theme tokens are trivial |
| Transcription | Groq Whisper Large V3 | Fastest Whisper endpoint; <1 s for a 30 s chunk |
| Suggestions + Chat | Groq GPT-OSS 120B (configurable) | Per assignment spec; update model ID in Settings |
| State | Custom `useSession` hook + `useRef` | Avoids stale closures in async recording callbacks without a global store |

---

## How it works

### Audio pipeline

1. `MediaRecorder` captures mic audio in the browser.
2. Every **30 seconds** (configurable), the current recording chunk is stopped and a new one starts immediately — zero audio gap.
3. The audio `Blob` is POSTed to `/api/transcribe` → Groq Whisper Large V3 → transcript text appended to the left column.
4. After transcription, `/api/suggestions` is called with the latest context window of the full transcript.

The restart-before-transcribe pattern ensures no audio is lost while the API round-trips.

### Suggestion prompt strategy

The system prompt instructs the model to output **exactly 3 suggestions with different types** from a fixed taxonomy:

| Type | When surfaced |
|------|---------------|
| `question` | Discussion is circling without a decision |
| `talking_point` | An important angle hasn't been raised |
| `fact_check` | A specific assertion was made that could be wrong |
| `action_item` | A concrete commitment just emerged |
| `insight` | A pattern or implication worth naming |

**Why variety is forced:** Without a diversity constraint, models default to whatever type they find easiest (usually "question"). Forcing different types every batch ensures the middle column stays useful across different meeting phases.

**Why the preview must deliver standalone value:** Users in a live meeting can't always click. The preview (2-3 sentences) is designed to be actionable on its own. The click expands into a full transcript-grounded answer.

**Context window:** The last 2,000 words of transcript are sent (configurable). This covers ~10 minutes of speech — enough context to be specific without inflating the prompt unnecessarily. Sending the full transcript from the start would be wasteful and slow.

### Chat prompt strategy

The system message includes:
1. A direct-voice instruction (no preamble)
2. The full transcript context (last 4,000 words)
3. When a suggestion is clicked: the `detailedAnswerPrompt` appended, which tells the model to lead with the most actionable insight and ground the answer in the transcript

Responses stream token-by-token so the chat column feels instant even before the full answer is ready.

---

## Settings (all editable in-app)

| Setting | Default | Description |
|---------|---------|-------------|
| Groq API key | — | Stored in `localStorage`, never sent anywhere except Groq |
| Model | `meta-llama/llama-4-maverick-17b-128e-instruct` | Update to Groq's GPT-OSS 120B model ID |
| Suggestion context window | 2,000 words | Words of transcript sent to the suggestion model |
| Chat context window | 4,000 words | Words of transcript sent as chat context |
| Refresh interval | 30 s | How often auto-refresh fires |
| Suggestion prompt | (see `src/lib/prompts.ts`) | Full system prompt, editable live |
| Chat system prompt | (see `src/lib/prompts.ts`) | System context for all chat turns |
| Suggestion detail prompt | (see `src/lib/prompts.ts`) | Appended when a suggestion card is clicked |

---

## Export

Click **Export** in the header to download a JSON file containing:
- Full transcript with timestamps
- Every suggestion batch with timestamps
- Full chat history (with `triggered_by` field for suggestion-click messages)

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── transcribe/route.ts   # Whisper Large V3
│   │   ├── suggestions/route.ts  # 3-card generation
│   │   └── chat/route.ts         # Streaming chat
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # 3-column shell
├── components/
│   ├── TranscriptPanel.tsx       # Left column
│   ├── SuggestionsPanel.tsx      # Middle column + cards
│   ├── ChatPanel.tsx             # Right column
│   └── SettingsModal.tsx         # Full settings overlay
├── hooks/
│   └── useSession.ts             # All state + API orchestration
└── lib/
    ├── prompts.ts                 # Default prompts + type colour map
    └── types.ts                   # Shared TypeScript types
```

---

## Tradeoffs

**Sequential transcribe → suggest vs. parallel:** Transcription runs first so the suggestion model always sees the newest speech. Running both in parallel would give faster UI feedback but suggestions would lag one chunk behind the transcript — confusing during live interviews.

**No VAD (Voice Activity Detection):** Left out per "do not over-engineer." The 500-byte minimum blob size check in the transcription route skips near-silent chunks cheaply. A full WebRTC VAD would be the production upgrade.

**JSON extraction fallback:** The suggestion route strips markdown code fences before parsing. Some models wrap JSON in ` ```json ` even when told not to. The regex fallback handles this silently rather than erroring.

**`useRef` sync pattern:** React's `useCallback` captures values at creation time. All frequently-changing values (`apiKey`, `settings`, `transcript`) are mirrored into refs and synced via `useEffect`. This avoids stale closures in the async recording callback chain without needing `useReducer` or a global store.

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

No environment variables needed — the API key is entered by the user in-app.
