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
        max_tokens: 400,
        temperature: 0.7,
        messages: [{ role: "system", content: system }, ...messages]
      })
    });

    const data = await response.json();

    if (response.status === 429) throw new Error('RATE_LIMIT');

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('EMPTY_RESPONSE');

    return text;
  };

  // Retry up to 3 times
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const text = await makeRequest();
      return res.status(200).json({ content: [{ type: "text", text }] });
    } catch (err) {
      lastError = err;
      if (err.message === 'RATE_LIMIT' && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 1000));
        continue;
      }
      break;
    }
  }

  // Fallback response
  const isSpam = system && system.includes('Spam');
  const fallback = isSpam
    ? '{"verdict":"Error","confidence":0,"explanation":"Try again ra!","triggerWords":[],"safetyAdvice":"Oka second wait chesi again try cheyyi ra!","actionSteps":["Wait 2-3 seconds","Paste message again","Click Analyze"]}'
    : '{"emotion":"Neutral","response":"Bro server busy ga undi ra, oka second wait chesi try cheyyi! 🙏","lang":"en"}';

  return res.status(200).json({ content: [{ type: "text", text: fallback }] });
}