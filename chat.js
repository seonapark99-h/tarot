export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  try {
    const body = req.body || {};

    // index.html now sends { prompt }, but this also supports the older Claude-style body
    // so the endpoint is forgiving during deployment/testing.
    const prompt = body.prompt || (Array.isArray(body.messages)
      ? body.messages.map((m) => {
          if (typeof m.content === 'string') return m.content;
          if (Array.isArray(m.content)) {
            return m.content.map((part) => part.text || '').join('\n');
          }
          return '';
        }).join('\n')
      : '');

    const systemInstruction = body.system || '당신은 연애 타로 리더입니다. 항상 올바른 JSON 형식으로만 응답하세요. 마크다운, 코드블록, 추가 텍스트 없이 JSON 객체만 출력하세요.';

    if (!prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 6000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: data.error?.message || 'Gemini API request failed',
        details: data,
      });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!text) {
      return res.status(502).json({ error: 'Gemini returned an empty response', details: data });
    }

    // Return both a simple Gemini-friendly shape and a Claude-like shape.
    res.status(200).json({
      text,
      content: [{ type: 'text', text }],
      raw: data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
