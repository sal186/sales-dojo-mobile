export async function POST(request) {
  try {
    const { text } = await request.json();

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Journey-D',
            ssmlGender: 'MALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('TTS error:', errText);
      return Response.json({ error: 'TTS error' }, { status: 502 });
    }

    const data = await response.json();
    return Response.json({ audioContent: data.audioContent });
  } catch (err) {
    console.error('TTS route error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
