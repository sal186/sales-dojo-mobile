export async function POST(request) {
  try {
    const { text } = await request.json();
    const key = process.env.GOOGLE_TTS_KEY || process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: 'No key' }, { status: 500 });

    const res = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'en-US', name: 'en-US-Journey-D' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: -1.0 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('TTS error:', err);
      return Response.json({ error: 'TTS failed' }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ audioContent: data.audioContent });
  } catch (err) {
    console.error('TTS error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
