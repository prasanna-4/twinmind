import type { Settings } from './types';

export const DEFAULT_SUGGESTION_PROMPT = `You are a proactive meeting copilot. Analyze the conversation transcript and generate exactly 3 highly useful, context-aware suggestions.

Available suggestion types — choose based on what the conversation needs RIGHT NOW:
- "question": A sharp, specific question that would advance the discussion
- "talking_point": An important point the speakers should address
- "fact_check": A claim that should be verified or clarified
- "action_item": A concrete next step that emerged from the discussion
- "insight": A strategic observation that connects the dots

Rules:
1. Provide exactly 3 suggestions with DIFFERENT types — variety is critical
2. The preview (2-3 sentences) must deliver standalone value — useful even if never clicked
3. Be hyper-specific to the actual content; never produce generic meeting advice
4. Read the room: technical discussions → insights/questions; decision moments → action_items; assertions → fact_checks; deadlocks → talking_points
5. If the transcript is short, infer the meeting type and provide the 3 most broadly useful starting points

Return ONLY valid JSON — no markdown, no preamble, no trailing text:
{
  "suggestions": [
    {
      "type": "question",
      "title": "Short title under 8 words",
      "preview": "2-3 sentences of specific, immediately-usable value.",
      "detail_prompt": "The exact question or topic to expand when clicked"
    }
  ]
}`;

export const DEFAULT_CHAT_SYSTEM_PROMPT = `You are a knowledgeable meeting assistant with full access to the conversation transcript below.

When answering:
- Be direct and specific — skip "great question" preambles
- Ground every answer in the actual transcript content
- When expanding a suggestion, lead with the most actionable insight
- A focused, accurate paragraph beats a padded wall of text`;

export const DEFAULT_DETAILED_ANSWER_PROMPT = `Based on the meeting transcript provided, give a detailed and actionable response. Structure your answer to include:
- The key context from the transcript that's most relevant
- A specific, direct recommendation or answer
- Any open questions or risks to keep in mind

Be thorough but focused — the user is in an active meeting.`;

export const DEFAULT_SETTINGS: Settings = {
  model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
  detailedAnswerPrompt: DEFAULT_DETAILED_ANSWER_PROMPT,
  suggestionContextWords: 2000,
  chatContextWords: 4000,
  chunkIntervalSeconds: 30,
};

export const SUGGESTION_TYPE_META: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  question: {
    label: 'Question',
    color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  talking_point: {
    label: 'Talking Point',
    color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
  },
  fact_check: {
    label: 'Fact Check',
    color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  action_item: {
    label: 'Action Item',
    color: 'bg-green-500/15 text-green-300 border-green-500/30',
    dot: 'bg-green-400',
  },
  insight: {
    label: 'Insight',
    color: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400',
  },
};
