export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system } = req.body;
  const groqMessages = [
    { role: "system", content: system },
    ...messages
  ];

  const makeRequest = async (retries = 2) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 500,
        messages: groqMessages
      })
    });
    const data = await response.json();
    if(response.status === 429 && retries > 0) {
      await new Promise(r => setTimeout(r, 3000));
      return makeRequest(retries - 1);
    }
    return data;
  };

  try {
    const data = await makeRequest();
    if(!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "No response", raw: data });
    }
    res.status(200).json({
      content: [{ type: "text", text: data.choices[0].message.content }]
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}