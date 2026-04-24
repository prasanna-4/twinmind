'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import TranscriptPanel from '@/components/TranscriptPanel';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import ChatPanel from '@/components/ChatPanel';
import SettingsModal from '@/components/SettingsModal';
import type { Suggestion } from '@/lib/types';

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const session = useSession();

  const handleSuggestionClick = (suggestion: Suggestion) => {
    // Format user message: title + the detail prompt
    const message = `**${suggestion.title}**\n\n${suggestion.detail_prompt}`;
    session.sendChatMessage(message, suggestion.title);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0a]">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">TwinMind</h1>
            <p className="text-[10px] text-white/35 leading-none mt-0.5">Live Suggestions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicators */}
          {session.isRecording && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              Live
            </span>
          )}

          {/* Error toast */}
          {session.error && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300">
              <span>{session.error}</span>
              <button
                onClick={session.clearError}
                className="text-red-300/60 hover:text-red-300 ml-1"
              >
                ×
              </button>
            </div>
          )}

          {/* Export */}
          <button
            onClick={session.exportSession}
            title="Export session"
            disabled={session.transcript.length === 0 && session.chatMessages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              bg-white/5 hover:bg-white/10 text-white/55 hover:text-white/85
              border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-150"
          >
            <ExportIcon />
            Export
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              bg-white/5 hover:bg-white/10 text-white/55 hover:text-white/85
              border border-white/10 transition-all duration-150"
          >
            <SettingsIcon />
            Settings
          </button>
        </div>
      </header>

      {/* ── No API key banner ───────────────────────────────────────────────── */}
      {!session.apiKey && (
        <div className="flex items-center justify-between px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
          <p className="text-xs text-amber-300">
            Paste your Groq API key in Settings to start.
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2"
          >
            Open Settings →
          </button>
        </div>
      )}

      {/* ── Three-column layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left — Transcript (25%) */}
        <div className="w-[25%] min-w-[220px] border-r border-white/8 overflow-hidden flex flex-col">
          <TranscriptPanel
            transcript={session.transcript}
            isRecording={session.isRecording}
            isTranscribing={session.isTranscribing}
            onStart={session.startRecording}
            onStop={session.stopRecording}
          />
        </div>

        {/* Middle — Suggestions (32%) */}
        <div className="w-[32%] min-w-[260px] border-r border-white/8 overflow-hidden flex flex-col">
          <SuggestionsPanel
            batches={session.suggestionBatches}
            isLoading={session.isLoadingSuggestions}
            isRecording={session.isRecording}
            nextRefreshIn={session.nextRefreshIn}
            onRefresh={session.refreshNow}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        {/* Right — Chat (43%) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatPanel
            messages={session.chatMessages}
            isLoading={session.isLoadingChat}
            onSend={(msg) => session.sendChatMessage(msg)}
          />
        </div>
      </div>

      {/* ── Settings modal ──────────────────────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          apiKey={session.apiKey}
          settings={session.settings}
          onSave={(key, settings) => {
            session.setApiKey(key);
            session.updateSettings(settings);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
