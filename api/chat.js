export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
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
          if (typeof m.content === "string") {
            return m.content;
          }

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
        error: "Prompt is required",
        received: body
      });
    }

    const models = [
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-flash"
    ];

    const maxOutputTokens = Math.min(body.max_tokens || 2000, 2000);

    let lastError = null;

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
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
                maxOutputTokens,
                temperature: 0.7
              }
            })
          }
        );

        const data = await response.json();

        if (response.ok) {
          const text =
            data.candidates?.[0]?.content?.parts
              ?.map((part) => part.text || "")
              .join("") || "";

          return res.status(200).json({
            content: [
              {
                type: "text",
                text
              }
            ],
            raw: data,
            usedModel: model
          });
        }

        lastError = {
          model,
          attempt,
          status: response.status,
          detail: data
        };

        if (response.status !== 503 && response.status !== 429) {
          return res.status(response.status).json({
            error: "Gemini API Error",
            ...lastError
          });
        }

        await new Promise((resolve) =>
          setTimeout(resolve, attempt * 1000)
        );
      }
    }

    return res.status(503).json({
      error: "All Gemini models failed after retries",
      detail: lastError
    });
  } catch (e) {
    return res.status(500).json({
      error: "Server Error",
      message: e.message
    });
  }
}
