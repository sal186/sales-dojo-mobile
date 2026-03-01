export async function POST(request) {
  try {
    const { text } = await request.json();
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'No key' }, { status: 500 });
    }

    // Try standard voices first (more widely available)
    const response = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'en-US', name: 'en-US-Standard-J' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: -1.0 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('TTS error:', errText);
      return Response.json({ error: 'TTS failed', fallback: true }, { status: 502 });
    }

    const data = await response.json();
    return Response.json({ audioContent: data.audioContent });
  } catch (err) {
    console.error('TTS route error:', err);
    return Response.json({ error: 'Server error', fallback: true }, { status: 500 });
  }
}
