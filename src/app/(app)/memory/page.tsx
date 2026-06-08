import { MemoryDashboard } from "@/components/memory/MemoryDashboard";

export const metadata = {
  title: "Memory — Castmill",
  description:
    "Tu segundo cerebro: notas, transcripciones, episodios y datos que la IA recuerda.",
};

export default function MemoryPage() {
  return <MemoryDashboard />;
}
