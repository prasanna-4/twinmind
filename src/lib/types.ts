export type SuggestionType =
  | 'question'
  | 'talking_point'
  | 'fact_check'
  | 'action_item'
  | 'insight';

export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  preview: string;
  detail_prompt: string;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  timestamp: number;
  responseTime?: string; // e.g. "843ms" from X-Response-Time header
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestionTitle?: string;
}

export interface Settings {
  model: string;
  suggestionPrompt: string;
  chatSystemPrompt: string;
  detailedAnswerPrompt: string;
  suggestionContextWords: number;
  chatContextWords: number;
  chunkIntervalSeconds: number;
}
