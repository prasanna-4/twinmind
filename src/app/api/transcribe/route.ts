import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const apiKey = formData.get('apiKey') as string | null;

    if (!audioFile || !apiKey) {
      return NextResponse.json(
        { error: 'Missing audio file or API key.' },
        { status: 400 }
      );
    }

    if (audioFile.size < 500) {
      // Blob is too small to contain meaningful speech; skip the API round-trip
      return NextResponse.json({ text: '' });
    }

    const groq = new Groq({ apiKey });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    });

    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[transcribe]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
