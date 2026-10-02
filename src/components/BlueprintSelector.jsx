export default function BlueprintSelector({
  author,
  name,
  onAuthorChange,
  onNameChange,
  onLoadAuthor,
  onOpen,
}) {
  const trimmedAuthor = author.trim()
  const trimmedName = name.trim()

  function handleSubmit(event) {
    event.preventDefault()
    onOpen(trimmedAuthor, trimmedName)
  }

  return (
    <form className="card selector" onSubmit={handleSubmit} aria-label="Buscar planos">
      <div className="selector__row">
        <label className="field">
          Autor
          <input
            value={author}
            onChange={(event) => onAuthorChange(event.target.value)}
            placeholder="john"
          />
        </label>
        <button
          type="button"
          className="button"
          onClick={() => onLoadAuthor(trimmedAuthor)}
          disabled={!trimmedAuthor}
        >
          Get blueprints
        </button>
      </div>
      <div className="selector__row">
        <label className="field">
          Plano
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="house"
          />
        </label>
        <button type="submit" className="button" disabled={!trimmedAuthor || !trimmedName}>
          Open
        </button>
      </div>
    </form>
  )
}
