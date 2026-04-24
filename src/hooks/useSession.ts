'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  TranscriptChunk,
  SuggestionBatch,
  Suggestion,
  ChatMessage,
  Settings,
} from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/prompts';

function getBestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

function mimeTypeToExt(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

function extractJSON(raw: string): string {
  // Strip markdown code fences if the model added them
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const obj = raw.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  return raw;
}

export function useSession() {
  // ── Rendered state ──────────────────────────────────────────────────────────
  const [apiKey, setApiKeyState] = useState('');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(0);

  // ── Mutable refs (safe to read inside callbacks without stale-closure risk) ─
  const apiKeyRef = useRef('');
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const transcriptRef = useRef<TranscriptChunk[]>([]);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const isRecordingRef = useRef(false);

  // Audio recording refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const overlapChunksRef = useRef<BlobPart[]>([]); // trailing 2s overlap between chunks
  const mimeTypeRef = useRef('');
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());

  // ── Keep refs in sync with state ───────────────────────────────────────────
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // ── Persist settings in localStorage ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedKey = localStorage.getItem('groq_api_key') ?? '';
    const savedSettings = localStorage.getItem('twinmind_settings');

    if (savedKey) {
      setApiKeyState(savedKey);
      apiKeyRef.current = savedKey;
    }
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as Partial<Settings>;
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(merged);
        settingsRef.current = merged;
      } catch {
        // ignore corrupt localStorage
      }
    }
  }, []);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) {
      setNextRefreshIn(0);
      return;
    }
    const id = setInterval(() => {
      const elapsed = (Date.now() - lastRefreshRef.current) / 1000;
      const remaining = Math.max(0, settingsRef.current.chunkIntervalSeconds - elapsed);
      setNextRefreshIn(Math.ceil(remaining));
    }, 500);
    return () => clearInterval(id);
  }, [isRecording]);

  // ── Audio helpers ───────────────────────────────────────────────────────────

  // Overlap buffer: the last 2 seconds of the previous chunk are prepended to
  // the next one so Whisper never sees a word cut in half at the boundary.
  const OVERLAP_SLICES = 2; // keep last N 1-second slices as overlap

  const startNewRecorder = useCallback((stream: MediaStream) => {
    const mimeType = getBestMimeType();
    mimeTypeRef.current = mimeType;
    // Seed the new chunk with the trailing overlap from the previous chunk
    recordingChunksRef.current = [...overlapChunksRef.current];

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };
    recorder.start(1000); // collect a slice every second for fine-grained overlap
    recorderRef.current = recorder;
  }, []);

  const stopAndGetBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        if (chunks.length === 0) { resolve(null); return; }

        // Save the trailing slices as overlap for the next chunk
        overlapChunksRef.current = chunks.slice(-OVERLAP_SLICES);

        resolve(new Blob(chunks, { type: mimeTypeRef.current || 'audio/webm' }));
      };
      recorder.stop();
    });
  }, []);

  // ── API calls ───────────────────────────────────────────────────────────────
  const transcribeBlob = useCallback(async (blob: Blob): Promise<void> => {
    if (!apiKeyRef.current || blob.size < 500) return;
    setIsTranscribing(true);

    try {
      const ext = mimeTypeToExt(mimeTypeRef.current);
      const fd = new FormData();
      fd.append('audio', blob, `chunk.${ext}`);
      fd.append('apiKey', apiKeyRef.current);

      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      const { text } = (await res.json()) as { text: string };

      if (text?.trim()) {
        const chunk: TranscriptChunk = {
          id: `chunk-${Date.now()}`,
          text: text.trim(),
          timestamp: Date.now(),
        };
        const next = [...transcriptRef.current, chunk];
        transcriptRef.current = next;
        setTranscript(next);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Transcription failed — check your Groq API key.');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (): Promise<void> => {
    const text = transcriptRef.current.map((c) => c.text).join(' ');
    if (!text.trim() || !apiKeyRef.current) return;

    setIsLoadingSuggestions(true);

    try {
      const s = settingsRef.current;
      const words = text.split(/\s+/);
      const contextText = words.slice(-s.suggestionContextWords).join(' ');

      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: contextText,
          apiKey: apiKeyRef.current,
          model: s.model,
          prompt: s.suggestionPrompt,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const responseTime = res.headers.get('X-Response-Time') ?? undefined;
      const data = (await res.json()) as { suggestions: Omit<Suggestion, 'id'>[] };

      if (data.suggestions?.length > 0) {
        const batch: SuggestionBatch = {
          id: `batch-${Date.now()}`,
          suggestions: data.suggestions.map((s, i) => ({
            ...s,
            id: `s-${Date.now()}-${i}`,
          })),
          timestamp: Date.now(),
          responseTime,
        };
        setSuggestionBatches((prev) => [batch, ...prev]);
      }
    } catch (err) {
      console.error('Suggestions error:', err);
      setError('Failed to generate suggestions.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // ── Refresh cycle ───────────────────────────────────────────────────────────
  const runRefreshCycle = useCallback(async () => {
    lastRefreshRef.current = Date.now();

    // Snapshot current audio and restart immediately so no audio is lost
    const blob = await stopAndGetBlob();
    if (streamRef.current && isRecordingRef.current) {
      startNewRecorder(streamRef.current);
    }

    // Transcribe, then suggest (sequential so suggestions see the new chunk)
    if (blob) await transcribeBlob(blob);
    await fetchSuggestions();
  }, [stopAndGetBlob, startNewRecorder, transcribeBlob, fetchSuggestions]);

  // ── Recording controls ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!apiKeyRef.current) {
      setError('Enter your Groq API key in Settings before recording.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isRecordingRef.current = true;
      setIsRecording(true);
      lastRefreshRef.current = Date.now();
      startNewRecorder(stream);

      const intervalMs = settingsRef.current.chunkIntervalSeconds * 1000;
      refreshIntervalRef.current = setInterval(runRefreshCycle, intervalMs);
    } catch {
      setError('Microphone access denied. Allow mic permissions and try again.');
    }
  }, [startNewRecorder, runRefreshCycle]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Process the final audio chunk
    const blob = await stopAndGetBlob();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (blob) {
      await transcribeBlob(blob);
      await fetchSuggestions();
    }
  }, [stopAndGetBlob, transcribeBlob, fetchSuggestions]);

  const refreshNow = useCallback(async () => {
    // Clear the auto-interval, run a cycle, restart the interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    await runRefreshCycle();
    if (isRecordingRef.current) {
      const intervalMs = settingsRef.current.chunkIntervalSeconds * 1000;
      refreshIntervalRef.current = setInterval(runRefreshCycle, intervalMs);
    }
  }, [runRefreshCycle]);

  // ── Chat ────────────────────────────────────────────────────────────────────
  const sendChatMessage = useCallback(
    async (content: string, suggestionTitle?: string) => {
      const trimmed = content.trim();
      if (!trimmed || !apiKeyRef.current) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-u`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
        suggestionTitle,
      };
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      const nextMessages = [...chatMessagesRef.current, userMsg, assistantMsg];
      chatMessagesRef.current = nextMessages;
      setChatMessages(nextMessages);
      setIsLoadingChat(true);

      try {
        const s = settingsRef.current;
        const fullText = transcriptRef.current.map((c) => c.text).join(' ');
        const contextText = fullText.split(/\s+/).slice(-s.chatContextWords).join(' ');

        // Build the message history to send (last 10 exchanges, excluding empty assistant placeholder)
        const history = chatMessagesRef.current
          .filter((m) => m.content)
          .slice(-10)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history,
            transcript: contextText,
            apiKey: apiKeyRef.current,
            model: s.model,
            systemPrompt: s.chatSystemPrompt,
            detailedAnswerPrompt: s.detailedAnswerPrompt,
            isSuggestionClick: !!suggestionTitle,
          }),
        });

        if (!res.ok) throw new Error(await res.text());

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });

          setChatMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: accumulated };
            }
            return copy;
          });
        }

        // Sync ref after stream completes
        setChatMessages((prev) => {
          chatMessagesRef.current = prev;
          return prev;
        });
      } catch (err) {
        console.error('Chat error:', err);
        setError('Chat request failed — check your API key.');
        setChatMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = {
              ...last,
              content: 'Sorry, something went wrong. Please try again.',
            };
          }
          chatMessagesRef.current = copy;
          return copy;
        });
      } finally {
        setIsLoadingChat(false);
      }
    },
    []
  );

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportSession = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      transcript: transcriptRef.current.map((c) => ({
        timestamp: new Date(c.timestamp).toISOString(),
        text: c.text,
      })),
      suggestions: suggestionBatches.map((b) => ({
        timestamp: new Date(b.timestamp).toISOString(),
        suggestions: b.suggestions.map((s) => ({
          type: s.type,
          title: s.title,
          preview: s.preview,
        })),
      })),
      chat: chatMessagesRef.current.map((m) => ({
        timestamp: new Date(m.timestamp).toISOString(),
        role: m.role,
        content: m.content,
        ...(m.suggestionTitle ? { triggered_by: m.suggestionTitle } : {}),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twinmind-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [suggestionBatches]);

  // ── Settings helpers ────────────────────────────────────────────────────────
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    apiKeyRef.current = key;
    localStorage.setItem('groq_api_key', key);
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      settingsRef.current = next;
      localStorage.setItem('twinmind_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    apiKey,
    settings,
    transcript,
    suggestionBatches,
    chatMessages,
    isRecording,
    isTranscribing,
    isLoadingSuggestions,
    isLoadingChat,
    error,
    nextRefreshIn,
    setApiKey,
    updateSettings,
    startRecording,
    stopRecording,
    refreshNow,
    sendChatMessage,
    exportSession,
    clearError,
  };
}

export { extractJSON };
