import { FeedbackKind } from '../hooks/useBlueprintEditor.js'

export default function FeedbackList({ items }) {
  const visible = items.filter(Boolean)
  if (visible.length === 0) return null

  return (
    <div className="feedback-list">
      {visible.map(({ kind, text }) => (
        <p
          key={`${kind}-${text}`}
          role={kind === FeedbackKind.ERROR ? 'alert' : 'status'}
          className={`feedback feedback--${kind}`}
        >
          {text}
        </p>
      ))}
    </div>
  )
}
