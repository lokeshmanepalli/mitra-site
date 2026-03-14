export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system } = req.body;

  const groqMessages = [
    { role: "system", content: system },
    ...messages
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        messages: groqMessages
      })
    });

    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data));

    if(!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "No choices in response", raw: data });
    }

    const converted = {
      content: [{ type: "text", text: data.choices[0].message.content }]
    };

    res.status(200).json(converted);
  } catch(err) {
    console.error("Groq error:", err);
    res.status(500).json({ error: err.message });
  }
}