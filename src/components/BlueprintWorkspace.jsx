import { useState } from 'react'
import { useAuthorBlueprints } from '../hooks/useAuthorBlueprints.js'
import { BlueprintState, FeedbackKind, useBlueprintEditor } from '../hooks/useBlueprintEditor.js'
import { useRealtimeBlueprint } from '../hooks/useRealtimeBlueprint.js'
import { UpdateMode } from '../realtime/realtimeTypes.js'
import { Technology } from '../realtime/transports.js'
import BlueprintCanvas from './BlueprintCanvas.jsx'
import BlueprintSelector from './BlueprintSelector.jsx'
import BlueprintTable from './BlueprintTable.jsx'
import BlueprintToolbar from './BlueprintToolbar.jsx'
import FeedbackList from './FeedbackList.jsx'

function describeState({ points, state, dirty }) {
  const count = `${points.length} ${points.length === 1 ? 'punto' : 'puntos'}`
  if (state === BlueprintState.DRAFT) return `${count} · sin crear`
  if (dirty) return `${count} · cambios sin guardar`
  return `${count} · guardado`
}

export default function BlueprintWorkspace({ token }) {
  const [technology, setTechnology] = useState(Technology.STOMP)
  const [authorInput, setAuthorInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const library = useAuthorBlueprints()
  const editor = useBlueprintEditor({ onPersisted: library.refresh })
  const { blueprint } = editor
  const collaborative = blueprint?.state === BlueprintState.SAVED

  const realtime = useRealtimeBlueprint({
    technology,
    token,
    author: collaborative ? blueprint.author : null,
    name: collaborative ? blueprint.name : null,
    onUpdate: (update) => {
      editor.applyRemoteUpdate(update)
      if (update.mode === UpdateMode.REPLACE) library.upsert(update)
    },
    onResync: () => {
      editor.reload()
      library.refresh()
    },
  })

  function openBlueprint(author, name) {
    setAuthorInput(author)
    setNameInput(name)
    if (author !== library.author) library.load(author)
    editor.open(author, name)
  }

  function handleAddPoint(point) {
    editor.addPoint(point)
    if (collaborative) realtime.publishPoint(point)
  }

  const realtimeFeedback = realtime.error && { kind: FeedbackKind.ERROR, text: realtime.error }
  const currentName = blueprint?.author === library.author ? blueprint.name : null

  return (
    <main className="workspace">
      <div className="workspace__sidebar">
        <BlueprintSelector
          author={authorInput}
          name={nameInput}
          onAuthorChange={setAuthorInput}
          onNameChange={setNameInput}
          onLoadAuthor={library.load}
          onOpen={openBlueprint}
        />
        <BlueprintTable
          author={library.author}
          items={library.items}
          status={library.status}
          error={library.error}
          currentName={currentName}
          onOpen={(name) => openBlueprint(library.author, name)}
          onRetry={library.refresh}
        />
      </div>

      <section className="card editor" aria-labelledby="editor-title">
        <header className="editor__header">
          <h2 id="editor-title">
            {blueprint ? `${blueprint.author} / ${blueprint.name}` : 'Ningún plano abierto'}
          </h2>
          {blueprint && <span className="muted">{describeState(blueprint)}</span>}
        </header>
        <BlueprintToolbar
          blueprint={blueprint}
          busy={editor.busy}
          technology={technology}
          connectionStatus={realtime.status}
          onTechnologyChange={setTechnology}
          onCreate={editor.create}
          onSave={editor.save}
          onDelete={editor.remove}
        />
        <FeedbackList items={[editor.feedback, realtimeFeedback]} />
        <BlueprintCanvas
          points={blueprint?.points ?? []}
          onAddPoint={handleAddPoint}
          disabled={!blueprint || editor.busy}
        />
        <p className="muted">
          Abre el mismo plano en dos pestañas y haz clic en el lienzo para dibujar en conjunto.
        </p>
      </section>
    </main>
  )
}
