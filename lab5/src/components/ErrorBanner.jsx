export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="banner error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}
