export async function POST(request) {
  try {
    var body = await request.json();
    var text = body.text;
    var gender = body.gender;
    var key = process.env.GOOGLE_TTS_KEY || process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: 'No key' }, { status: 500 });

    var voiceName = gender === 'female' ? 'en-US-Studio-O' : 'en-US-Studio-M';

    var res = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text },
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
      var err = await res.text();
      console.error('TTS error:', err);
      return Response.json({ error: 'TTS failed' }, { status: 502 });
    }

    var data = await res.json();
    return Response.json({ audioContent: data.audioContent });
  } catch (err) {
    console.error('TTS error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
