export async function POST(request) {
  try {
    const { messages, systemPrompt, mode } = await request.json();

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const model = 'gemini-2.5-flash';

    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (systemPrompt) {
      geminiMessages.unshift({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      if (geminiMessages.length > 1 && geminiMessages[1].role === 'user') {
        geminiMessages.splice(1, 0, {
          role: 'model',
          parts: [{ text: 'Understood. I will follow these instructions.' }],
        });
      }
    }

    const body = {
      contents: geminiMessages,
      generationConfig: {
        temperature: mode === 'scorecard' ? 0.3 : 0.8,
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
