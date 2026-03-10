'use client'

interface FlaggaProps {
  label: string
  active: boolean
  color: string
  onClick?: () => void
  readonly?: boolean
  value?: string
}

export default function Flagga({ label, active, color, onClick, readonly, value }: FlaggaProps) {
  const colorMap: Record<string, { on: string; off: string }> = {
    green: { on: 'bg-green-500 text-white', off: 'bg-gray-100 text-gray-400 border border-gray-200' },
    blue: { on: 'bg-blue-500 text-white', off: 'bg-gray-100 text-gray-400 border border-gray-200' },
    purple: { on: 'bg-purple-500 text-white', off: 'bg-gray-100 text-gray-400 border border-gray-200' },
    amber: { on: 'bg-amber-400 text-white', off: 'bg-gray-100 text-gray-400 border border-gray-200' },
    teal: { on: 'bg-teal-500 text-white', off: 'bg-gray-100 text-gray-400 border border-gray-200' },
    rose: { on: 'bg-rose-500 text-white', off: 'bg-gray-100 text-gray-400 border border-gray-200' },
  }

  const colors = colorMap[color] || colorMap.green
  const cls = active ? colors.on : colors.off

  const displayLabel = value && active ? `${label}: ${value}` : label

  if (readonly) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
        {displayLabel}
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-all ${cls} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      title={active ? `Klicka för att ta bort ${label}` : `Klicka för att lägga till ${label}`}
    >
      {displayLabel}
    </button>
  )
}
