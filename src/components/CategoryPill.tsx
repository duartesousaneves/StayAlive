interface Props {
  /** 'category' = coloured pill with icon; 'tag' = blue pill; 'suggestion' = amber clickable; 'none' = grey */
  variant: 'category' | 'tag' | 'suggestion' | 'none'
  label: string
  icon?: string
  color?: string      // hex, only used when variant='category'
  onClick?: () => void
  onRemove?: () => void
}

export default function CategoryPill({ variant, label, icon, color, onClick, onRemove }: Props) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium'

  const variantClass =
    variant === 'category'   ? 'text-white'
    : variant === 'tag'      ? 'bg-blue-100 text-blue-700'
    : variant === 'suggestion' ? 'bg-amber-100 text-amber-700 cursor-pointer hover:bg-amber-200 active:bg-amber-300'
    :                           'bg-gray-100 text-gray-400'

  const style = variant === 'category' && color ? { backgroundColor: color } : undefined

  return (
    <span className={`${base} ${variantClass}`} style={style} onClick={onClick}>
      {icon && <span>{icon}</span>}
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 leading-none hover:opacity-70"
        >
          ✕
        </button>
      )}
    </span>
  )
}
