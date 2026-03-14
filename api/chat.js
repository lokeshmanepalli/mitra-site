export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { messages, system } = req.body;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 300,
      messages: [{ role: "system", content: system }, ...messages]
    })
  });
  const data = await response.json();
  res.status(200).json({
    content: [{ type: "text", text: data.choices[0].message.content }]
  });
}