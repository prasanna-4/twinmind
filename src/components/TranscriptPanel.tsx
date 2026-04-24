'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptChunk } from '@/lib/types';

interface Props {
  transcript: TranscriptChunk[];
  isRecording: boolean;
  isTranscribing: boolean;
  onStart: () => void;
  onStop: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TranscriptPanel({
  transcript,
  isRecording,
  isTranscribing,
  onStart,
  onStop,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  // Track whether the user has manually scrolled up to read history
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    userScrolledUpRef.current = !atBottom;
  };

  // Only auto-scroll when the user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">
          Transcript
        </h2>
        {isTranscribing && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Transcribing…
          </span>
        )}
      </div>

      {/* Transcript body */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
      >
        {transcript.length === 0 ? (
          <p className="text-sm text-white/30 mt-4">
            {isRecording
              ? 'Listening — first transcript will appear in ~30 seconds.'
              : 'Press the mic button to start capturing your meeting.'}
          </p>
        ) : (
          transcript.map((chunk) => (
            <div key={chunk.id} className="group">
              <span className="block text-[10px] text-white/30 mb-0.5 font-mono">
                {formatTime(chunk.timestamp)}
              </span>
              <p className="text-sm text-white/85 leading-relaxed">{chunk.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mic button */}
      <div className="px-4 py-4 border-t border-white/10">
        <button
          onClick={isRecording ? onStop : onStart}
          className={`
            w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm
            transition-all duration-200 select-none
            ${
              isRecording
                ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
            }
          `}
        >
          {isRecording ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
              Stop Recording
            </>
          ) : (
            <>
              <MicIcon />
              Start Recording
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
      />
    </svg>
  );
}
