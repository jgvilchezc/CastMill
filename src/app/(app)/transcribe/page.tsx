import { TranscribeTool } from "@/components/transcribe/TranscribeTool";

export const metadata = {
  title: "Quick Transcribe — Castmill",
  description:
    "Transcribí audios cortos (WhatsApp, voice notes) a texto limpio listo para un LLM. Glosario opcional para nombres y términos únicos.",
};

export default function TranscribePage() {
  return <TranscribeTool />;
}
