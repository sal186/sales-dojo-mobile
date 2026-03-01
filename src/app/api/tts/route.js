export async function POST(request) {
  try {
    const { text, gender } = await request.json();
    const key = process.env.GOOGLE_TTS_KEY || process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: 'No key' }, { status: 500 });

    const voiceName = gender === 'female' ? 'en-US-Studio-O' : 'en-US-Studio-M';

    // Convert text to SSML for natural speech
    let ssml = text
      .replace(/\.\s/g, '.<break time="400ms"/> ')
      .replace(/,\s/g, ',<break time="200ms"/> ')
      .replace(/\?\s/g, '?<break time="300ms"/> ')
      .replace(/!\s/g, '!<break time="300ms"/> ')
      .replace(/—/g, '<break time="300ms"/>')
      .replace(/\.\.\./g, '<break time="500ms"/>')
      .replace(/"/g, '')
      .replace(/&/g, '&amp;');

    ssml = '<speak>' + ssml + '</speak>';

    const res = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { ssml },
          voice: { languageCode: 'en-US', name: voiceName },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95,
            pitch: gender === 'female' ? 0.5 : -1.5,
            effectsProfileId: ['handset-class-device'],
          },
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
