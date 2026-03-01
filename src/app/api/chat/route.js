// ============================================
// GEMINI API PROXY
// Keeps API key server-side on Vercel.
// ~1-2 cents per full roleplay session with Flash.
// ============================================

export async function POST(request) {
  try {
    const { messages, systemPrompt, mode } = await request.json();

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // flash-lite for roleplay (cheap + fast), flash for scorecards (smarter)
    const model = mode === 'scorecard'
      ? 'gemini-1.5-flash'
      : 'gemini-1.5-flash';

    const geminiMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const body = {
      contents: geminiMessages,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: mode === 'scorecard' ? 0.3 : 0.85,
        maxOutputTokens: mode === 'scorecard' ? 2048 : 256,
        topP: 0.9,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini error:', errText);
      return Response.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return Response.json({ text });
  } catch (err) {
    console.error('API route error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
