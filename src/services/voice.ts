import { RoomServiceClient } from "livekit-server-sdk";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audio: Buffer): Promise<string> {
  // For real usage: await openai.audio.transcriptions.create({ file: ..., model: "whisper-1" });
  // Stubbed to keep CI deterministic:
  return "TRANSCRIPT_STUB";
}

export async function setupVoiceRoom() {
  const lk = new RoomServiceClient(
    process.env.LIVEKIT_HOST || "",
    process.env.LIVEKIT_API_KEY || "",
    process.env.LIVEKIT_API_SECRET || ""
  );
  return lk.createRoom({ name: "sinapse-room" });
}

