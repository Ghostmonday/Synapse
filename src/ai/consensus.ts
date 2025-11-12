import OpenAI from "openai";
const ds = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });

export async function llmConsensus(inputs: string[]): Promise<string> {
  const prompt = `Consensus from:\n${inputs.join("\n")}`;
  // Stubbed for determinism; replace with real call if needed
  return `CONSENSUS_STUB:${Buffer.from(prompt).toString("base64").slice(0,16)}`;
}

export async function voiceToCommit(transcript: string): Promise<string> {
  return llmConsensus([transcript]);
}

