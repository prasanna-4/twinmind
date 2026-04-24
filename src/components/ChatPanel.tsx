'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/types';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (content: string) => void;
}

export default function ChatPanel({ messages, isLoading, onSend }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    userScrolledUpRef.current = !atBottom;
  };

  // Auto-scroll unless the user has scrolled up to read history.
  // Always scroll when a new user message is sent (isLoading flips true).
  useEffect(() => {
    if (!userScrolledUpRef.current || isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest flex-1">
          Chat
        </h2>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-white/40">
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0"
      >
        {messages.length === 0 && (
          <p className="text-sm text-white/30 mt-4">
            Click a suggestion or type a question to get started.
          </p>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-end gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-white/85 placeholder:text-white/30
              outline-none leading-relaxed min-h-[28px] max-h-[160px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500
              disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1.5 pl-1">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Suggestion reference label */}
      {isUser && message.suggestionTitle && (
        <span className="text-[10px] text-blue-400/60 mb-1 pr-1">
          via suggestion: {message.suggestionTitle}
        </span>
      )}

      <div
        className={`
          max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${
            isUser
              ? 'bg-blue-600/25 text-white/90 rounded-tr-sm border border-blue-500/25'
              : 'bg-white/[0.06] text-white/85 rounded-tl-sm border border-white/10'
          }
        `}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <span className="flex gap-0.5 items-center h-4">
            <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>

      <span className="text-[10px] text-white/20 mt-1 px-1">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
