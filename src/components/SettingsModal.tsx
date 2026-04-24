'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/prompts';

interface Props {
  apiKey: string;
  settings: Settings;
  onSave: (apiKey: string, settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({ apiKey, settings, onSave, onClose }: Props) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [local, setLocal] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);

  const update = (field: keyof Settings, value: string | number) =>
    setLocal((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    onSave(localKey.trim(), local);
    onClose();
  };

  const handleReset = () => setLocal(DEFAULT_SETTINGS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#161616] border border-white/15 rounded-2xl flex flex-col shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
          {/* API Key */}
          <Section title="Groq API Key" hint="Stored locally — never sent to our servers.">
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="gsk_…"
                className="flex-1 input-field font-mono text-sm"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="px-3 rounded-lg border border-white/15 text-white/50 hover:text-white/80
                  bg-white/5 hover:bg-white/10 text-xs transition-all"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </Section>

          {/* Model */}
          <Section title="Model" hint="Groq model ID for suggestions and chat.">
            <input
              type="text"
              value={local.model}
              onChange={(e) => update('model', e.target.value)}
              className="w-full input-field font-mono text-sm"
            />
          </Section>

          {/* Context Windows */}
          <Section title="Context Windows">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  Suggestions (words)
                </label>
                <input
                  type="number"
                  min={100}
                  max={8000}
                  value={local.suggestionContextWords}
                  onChange={(e) => update('suggestionContextWords', Number(e.target.value))}
                  className="w-full input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  Chat (words)
                </label>
                <input
                  type="number"
                  min={100}
                  max={16000}
                  value={local.chatContextWords}
                  onChange={(e) => update('chatContextWords', Number(e.target.value))}
                  className="w-full input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  Refresh interval (seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={local.chunkIntervalSeconds}
                  onChange={(e) => update('chunkIntervalSeconds', Number(e.target.value))}
                  className="w-full input-field"
                />
              </div>
            </div>
          </Section>

          {/* Suggestion Prompt */}
          <Section
            title="Live Suggestion Prompt"
            hint="System prompt sent to the model when generating the 3 suggestion cards."
          >
            <textarea
              value={local.suggestionPrompt}
              onChange={(e) => update('suggestionPrompt', e.target.value)}
              rows={8}
              className="w-full input-field text-xs font-mono leading-relaxed resize-y"
            />
          </Section>

          {/* Chat System Prompt */}
          <Section
            title="Chat System Prompt"
            hint="System context given to the model for all chat messages."
          >
            <textarea
              value={local.chatSystemPrompt}
              onChange={(e) => update('chatSystemPrompt', e.target.value)}
              rows={5}
              className="w-full input-field text-xs font-mono leading-relaxed resize-y"
            />
          </Section>

          {/* Detailed Answer Prompt */}
          <Section
            title="Suggestion Detail Prompt"
            hint="Appended to the chat system prompt when the user clicks a suggestion card."
          >
            <textarea
              value={local.detailedAnswerPrompt}
              onChange={(e) => update('detailedAnswerPrompt', e.target.value)}
              rows={5}
              className="w-full input-field text-xs font-mono leading-relaxed resize-y"
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <button
            onClick={handleReset}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white/90
                border border-white/15 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600
                hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-medium text-white/80">{title}</p>
        {hint && <p className="text-xs text-white/35 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
