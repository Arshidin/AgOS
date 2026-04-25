interface ProgressBarProps {
  current: number // 1-based current step
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i + 1 < current
        const isCurrent = i + 1 === current
        return (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-400"
            style={{
              background: isDone
                ? '#2B180A'
                : isCurrent
                  ? 'hsl(24,73%,54%)'
                  : '#e8ddd0',
            }}
          />
        )
      })}
    </div>
  )
}
