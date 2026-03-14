export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system } = req.body;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const makeRequest = async (retries = 3) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: contents,
          generationConfig: { maxOutputTokens: 500 }
        })
      }
    );
    const data = await response.json();
    if(response.status === 429 && retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return makeRequest(retries - 1);
    }
    return data;
  };

  try {
    const data = await makeRequest();
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({
      content: [{ type: "text", text: text }]
    });
  } catch(err) {
    res.status(500).json({ error: "Gemini error", raw: data });
  }
}