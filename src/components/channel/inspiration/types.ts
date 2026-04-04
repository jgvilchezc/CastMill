export interface MoodBoardItem {
  id: string
  type: "gap" | "trend" | "series" | "question"
  title: string
  description: string
  format?: string
  hook?: string
  savedAt: number
}
