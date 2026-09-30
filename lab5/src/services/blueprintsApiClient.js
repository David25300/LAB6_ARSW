// Este se conecta al real que estara en el lab4 y tendra (getAll, getByAuthor,getByAuthorAndName, create)
// blueprintsApiClient.js
// Servicio "real": misma interfaz que apimock.js (getAll, getByAuthor,
// getByAuthorAndName, create), pero habla con el backend real via Axios.
// La instancia de axios (con baseURL e interceptores JWT) vive en apiClient.js.

import api from './apiClient.js'

// El backend real envuelve TODA respuesta en ApiResponse<T> = { code, message, data }.
// Por eso aqui sacamos .data.data (el .data de axios, y adentro el .data del wrapper).

async function getAll() {
  const { data } = await api.get('/api/v1/blueprints')
  return data.data
}

async function getByAuthor(author) {
  try {
    const { data } = await api.get(`/api/v1/blueprints/${encodeURIComponent(author)}`)
    return data.data
  } catch (err) {
    // El backend responde 404 cuando el autor no tiene planos; el mock devuelve [].
    // Mantenemos la misma interfaz: "sin planos" no es un error.
    if (err.response?.status === 404) return []
    throw err
  }
}

async function getByAuthorAndName(author, name) {
  const { data } = await api.get(
    `/api/v1/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`,
  )
  return data.data
}

async function create(payload) {
  const { data } = await api.post('/api/v1/blueprints', payload)
  return data.data
}

// PUT reemplaza la lista completa de puntos (el autor y el nombre van en la URL)
async function update(author, name, points) {
  const { data } = await api.put(
    `/api/v1/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`,
    { points },
  )
  return data.data
}

async function remove(author, name) {
  await api.delete(`/api/v1/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`)
}

export default { getAll, getByAuthor, getByAuthorAndName, create, update, remove }
