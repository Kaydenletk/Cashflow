import { getPrediction, getSnapshot } from "@/lib/data/compose";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function localFallback(symbol: string, question: string, snapshotPrice: number, prediction: Awaited<ReturnType<typeof getPrediction>>) {
  return [
    `FinBoard AI view for ${symbol}: current price is ${snapshotPrice.toFixed(2)}.`,
    `Bias is ${prediction.bias} with ${Math.round(prediction.probabilityUp * 100)}% upside probability over 5 trading days.`,
    `Primary setup is ${prediction.setup}.`,
    `Key invalidation is ${prediction.invalidation?.toFixed(2) ?? "n/a"} and target band is ${prediction.targetLow?.toFixed(2) ?? "n/a"} to ${prediction.targetHigh?.toFixed(2) ?? "n/a"}.`,
    `Question received: "${question}".`
  ].join(" ");
}

export async function answerChat(symbol: string, question: string, history: ChatMessage[]) {
  const [snapshot, prediction] = await Promise.all([getSnapshot(symbol), getPrediction(symbol)]);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return localFallback(symbol, question, snapshot.quote.price, prediction);
  }

  const systemPrompt = [
    "You are FinBoard AI, a concise swing-trading market assistant.",
    "Use only the supplied symbol summary.",
    "Do not promise certainty.",
    "Always mention bias, probability, invalidation, and target band when relevant.",
    `Symbol: ${symbol}`,
    `Price: ${snapshot.quote.price}`,
    `Bias: ${prediction.bias}`,
    `Probability Up: ${prediction.probabilityUp}`,
    `Setup: ${prediction.setup}`,
    `Reasons: ${prediction.reasons.join("; ")}`,
    `Warnings: ${prediction.warnings.join("; ")}`,
    `Invalidation: ${prediction.invalidation}`,
    `Target Band: ${prediction.targetLow} - ${prediction.targetHigh}`
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          ...history.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }]
          })),
          { role: "user", parts: [{ text: `${systemPrompt}\n\nUser question: ${question}` }] }
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 300
        }
      })
    }
  );

  if (!response.ok) {
    return localFallback(symbol, question, snapshot.quote.price, prediction);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join(" ").trim();

  return text || localFallback(symbol, question, snapshot.quote.price, prediction);
}
