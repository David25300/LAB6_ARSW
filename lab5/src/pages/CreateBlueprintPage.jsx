import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { createBlueprint } from '../features/blueprints/blueprintsSlice.js'
import BlueprintForm from '../components/BlueprintForm.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

// Ruta protegida (ver PrivateRoute en App.jsx): el POST exige JWT en el backend.
export default function CreateBlueprintPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const status = useSelector((s) => s.blueprints.status)
  // Error del ultimo intento en ESTA pagina (no uno viejo que quedo en el store)
  const [saveError, setSaveError] = useState(null)

  const save = async (payload) => {
    setSaveError(null)
    try {
      const bp = await dispatch(createBlueprint(payload)).unwrap()
      navigate(`/blueprints/${encodeURIComponent(bp.author)}/${encodeURIComponent(bp.name)}`)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      {saveError && <ErrorBanner message={`No se pudo crear el plano: ${saveError}`} />}
      <BlueprintForm onSubmit={save} submitting={status.create === 'loading'} />
    </div>
  )
}
