export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system } = req.body;

  const makeRequest = async () => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 350,
        temperature: 0.8,
        messages: [{ role: "system", content: system }, ...messages]
      })
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || 2;
      throw new Error(`RATE_LIMIT:${retryAfter}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('EMPTY');
    return text;
  };

  // Retry 4 times with increasing delays
  const delays = [1500, 3000, 5000, 8000];

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const text = await makeRequest();
      return res.status(200).json({ content: [{ type: "text", text }] });
    } catch (err) {
      const isRateLimit = err.message.startsWith('RATE_LIMIT');
      const isLast = attempt === 3;
      if (isLast) break;
      const delay = isRateLimit
        ? Math.max(parseInt(err.message.split(':')[1] || 2) * 1000, delays[attempt])
        : delays[attempt];
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return res.status(200).json({
    content: [{
      type: "text",
      text: '{"emotion":"Neutral","response":"Arey server chinna load lo undi ra — 10 seconds wait chesi again try cheyyi! 🙏","lang":"en"}'
    }]
  });
}