'use client';

import type { SuggestionBatch, Suggestion } from '@/lib/types';
import { SUGGESTION_TYPE_META } from '@/lib/prompts';

interface Props {
  batches: SuggestionBatch[];
  isLoading: boolean;
  isRecording: boolean;
  nextRefreshIn: number;
  onRefresh: () => void;
  onSuggestionClick: (suggestion: Suggestion) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SuggestionsPanel({
  batches,
  isLoading,
  isRecording,
  nextRefreshIn,
  onRefresh,
  onSuggestionClick,
}: Props) {
  const latestBatch = batches[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">
          Live Suggestions
        </h2>
        <div className="flex items-center gap-2">
          {isRecording && nextRefreshIn > 0 && !isLoading && (
            <span className="text-xs text-white/35 font-mono tabular-nums">
              {nextRefreshIn}s
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh suggestions"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
              bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90
              border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150"
          >
            <RefreshIcon spinning={isLoading} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="px-4 pt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-white/5 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      )}

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 min-h-0">
        {!isLoading && batches.length === 0 && (
          <p className="text-sm text-white/30 mt-4">
            {isRecording
              ? 'Suggestions will appear after the first transcript chunk.'
              : 'Start recording to generate live suggestions.'}
          </p>
        )}

        {batches.map((batch, batchIdx) => (
          <div key={batch.id}>
            {/* Batch timestamp + divider */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-white/25 font-mono">
                {formatTime(batch.timestamp)}
              </span>
              {batchIdx === 0 && (
                <span className="text-[10px] text-blue-400/70 font-medium">Latest</span>
              )}
              {batch.responseTime && (
                <span className="text-[10px] text-white/20 font-mono">
                  {batch.responseTime}
                </span>
              )}
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {batch.suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onClick={() => onSuggestionClick(suggestion)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: Suggestion;
  onClick: () => void;
}) {
  const meta = SUGGESTION_TYPE_META[suggestion.type] ?? SUGGESTION_TYPE_META.insight;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03]
        hover:bg-white/[0.07] hover:border-white/20 transition-all duration-150
        p-3.5 group"
    >
      {/* Type badge */}
      <span
        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5
          rounded-full border ${meta.color} mb-2`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>

      {/* Title */}
      <p className="text-sm font-semibold text-white/90 mb-1 leading-snug">
        {suggestion.title}
      </p>

      {/* Preview */}
      <p className="text-xs text-white/55 leading-relaxed line-clamp-3">
        {suggestion.preview}
      </p>

      {/* Click affordance */}
      <p className="text-[10px] text-white/25 mt-2 group-hover:text-blue-400/60 transition-colors">
        Click for detailed answer →
      </p>
    </button>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
