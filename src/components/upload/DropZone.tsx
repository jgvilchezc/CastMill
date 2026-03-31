"use client"

import { useRef, useState } from "react"
import { UploadCloud } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DropZoneProps {
  onFile: (file: File) => void
}

export function DropZone({ onFile }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 cursor-pointer transition-colors",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleChange}
      />
      <UploadCloud className={cn("h-12 w-12 mb-4 transition-colors", dragOver ? "text-primary" : "text-muted-foreground")} />
      <p className="text-base font-medium mb-1">Drop your file here</p>
      <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
        Choose file
      </Button>
      <p className="text-xs text-muted-foreground mt-4">.mp3 · .mp4 · .wav · .m4a</p>
    </motion.div>
  )
}
