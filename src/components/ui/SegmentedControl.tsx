import { useState } from 'react'

export interface Segment<T extends string = string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
}

function SegmentBtn<T extends string>({
  segment,
  isActive,
  onClick,
}: {
  segment: Segment<T>
  isActive: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 10px',
        borderRadius: 6,
        border: 'none',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: isActive ? 500 : 400,
        cursor: 'pointer',
        transition: 'background 60ms, color 60ms, box-shadow 60ms',
        background: isActive ? 'var(--bg-c)' : 'none',
        color: isActive ? 'var(--fg)' : hovered ? 'var(--fg)' : 'var(--fg2)',
        boxShadow: isActive ? 'var(--sh-sm)' : 'none',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {segment.label}
    </button>
  )
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        background: 'var(--bg-m)',
        borderRadius: 8,
      }}
    >
      {segments.map((seg) => (
        <SegmentBtn
          key={seg.value}
          segment={seg}
          isActive={seg.value === value}
          onClick={() => onChange(seg.value)}
        />
      ))}
    </div>
  )
}
