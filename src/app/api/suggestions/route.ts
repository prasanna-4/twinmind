import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

const REQUIRED_FIELDS = ['type', 'title', 'preview', 'detail_prompt'] as const;
const VALID_TYPES = new Set([
  'question', 'talking_point', 'fact_check', 'action_item', 'insight',
]);

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const obj = raw.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  return raw;
}

function validateSuggestions(raw: string): Record<string, string>[] {
  const parsed = JSON.parse(extractJSON(raw)) as { suggestions: unknown[] };
  if (!Array.isArray(parsed.suggestions)) throw new Error('suggestions is not an array');

  return parsed.suggestions
    .filter((s): s is Record<string, string> => {
      if (!s || typeof s !== 'object') return false;
      const obj = s as Record<string, unknown>;
      return (
        REQUIRED_FIELDS.every((k) => typeof obj[k] === 'string' && (obj[k] as string).trim()) &&
        VALID_TYPES.has(obj.type as string)
      );
    })
    .slice(0, 3);
}

// Stricter retry prompt — appended when the first attempt fails validation
const RETRY_SUFFIX = `\n\nCRITICAL: Your previous response was not valid JSON or had missing fields.
Return ONLY a raw JSON object — no markdown, no explanation, nothing else before or after the JSON.
Every suggestion MUST have: type, title, preview, detail_prompt.`;

export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    const body = (await request.json()) as {
      transcript: string;
      apiKey: string;
      model: string;
      prompt: string;
    };

    const { transcript, apiKey, model, prompt } = body;

    if (!transcript?.trim() || !apiKey || !model) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    const call = (systemPrompt: string) =>
      groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Meeting transcript:\n\n${transcript}\n\nGenerate exactly 3 suggestions now.`,
          },
        ],
        temperature: 0.65,
        max_tokens: 1024,
        stream: false,
      });

    // First attempt
    let raw = (await call(prompt)).choices[0]?.message?.content ?? '';
    let validated = validateSuggestions(raw);

    // Silent retry if validation yielded nothing
    if (validated.length === 0) {
      console.warn('[suggestions] first attempt failed validation — retrying');
      raw = (await call(prompt + RETRY_SUFFIX)).choices[0]?.message?.content ?? '';
      validated = validateSuggestions(raw);
    }

    if (validated.length === 0) {
      throw new Error('Suggestions failed validation after retry.');
    }

    const elapsed = Math.round(performance.now() - start);
    return NextResponse.json(
      { suggestions: validated },
      { headers: { 'X-Response-Time': `${elapsed}ms` } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[suggestions]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
