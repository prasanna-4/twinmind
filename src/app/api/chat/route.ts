import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      history: { role: 'user' | 'assistant'; content: string }[];
      transcript: string;
      apiKey: string;
      model: string;
      systemPrompt: string;
      detailedAnswerPrompt: string;
      isSuggestionClick: boolean;
    };

    const {
      history,
      transcript,
      apiKey,
      model,
      systemPrompt,
      detailedAnswerPrompt,
      isSuggestionClick,
    } = body;

    if (!apiKey || !model) {
      return new Response('Missing API key or model.', { status: 400 });
    }

    const groq = new Groq({ apiKey });

    const transcriptSection = transcript?.trim()
      ? `\n\n---\nMeeting transcript context:\n${transcript}\n---`
      : '';

    const systemContent =
      systemPrompt +
      transcriptSection +
      (isSuggestionClick ? `\n\n${detailedAnswerPrompt}` : '');

    const stream = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemContent },
        ...history,
      ],
      temperature: 0.5,
      max_tokens: 2048,
      stream: true,
    });

    const encoder = new TextEncoder();
    const start = performance.now();
    let ttft: number | null = null;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              // Record time-to-first-token once
              if (ttft === null) {
                ttft = Math.round(performance.now() - start);
                console.log(`[chat] TTFT: ${ttft}ms`);
              }
              controller.enqueue(encoder.encode(text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Header is set before streaming starts; TTFT is logged server-side
        'X-Request-Start': String(Math.round(start)),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat]', message);
    return new Response(message, { status: 500 });
  }
}
