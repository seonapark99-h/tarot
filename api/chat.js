export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY not configured"
    });
  }

  try {
    const body = req.body || {};

    const userText =
      body.messages
        ?.map((m) => {
          if (typeof m.content === "string") return m.content;
          if (Array.isArray(m.content)) {
            return m.content
              .map((c) => c.text || "")
              .join("\n");
          }
          return "";
        })
        .join("\n\n") || "";

    const systemText = body.system || "";

    const prompt = systemText
      ? `${systemText}\n\n${userText}`
      : userText;

    if (!prompt.trim()) {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    const geminiModel = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: body.max_tokens || 2000,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gemini API Error",
        detail: data
      });
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") || "";

    // index.html이 기존 Anthropic 응답 형식을 기대하므로
    // Gemini 응답을 Anthropic 비슷한 형태로 변환
    return res.status(200).json({
      content: [
        {
          type: "text",
          text
        }
      ],
      raw: data
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}
