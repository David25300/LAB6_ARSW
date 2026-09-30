//Simula las operaciones que pasaran en el backend real,
//Datos semilla
let blueprints = [
  {
    author: 'Sebastian',
    name: 'house-plan',
    points: [
      { x: 40, y: 40 },
      { x: 200, y: 40 },
      { x: 200, y: 160 },
      { x: 40, y: 160 },
    ],
  },
  {
    author: 'Sebastian',
    name: 'garage',
    points: [
      { x: 80, y: 80 },
      { x: 240, y: 80 },
      { x: 240, y: 200 },
    ],
  },
  {
    author: 'Santiago',
    name: 'office-tower',
    points: [
      { x: 0, y: 0 },
      { x: 320, y: 0 },
      { x: 320, y: 280 },
      { x: 0, y: 280 },
      { x: 0, y: 0 },
    ],
  },
  {
    author: 'Santiago',
    name: 'demo-square',
    points: [
      { x: 100, y: 100 },
      { x: 220, y: 100 },
      { x: 220, y: 220 },
      { x: 100, y: 220 },
    ],
  },
]

//Operaciones

async function getAll() {
  return blueprints
}

async function getByAuthor(author) {
  return blueprints.filter((bp) => bp.author === author)
}

async function getByAuthorAndName(author, name) {
  const found = blueprints.find((bp) => bp.author === author && bp.name === name)
  if (!found) {
    const err = new Error(`Blueprint '${name}' de '${author}' no encontrado (mock)`)
    err.status = 404
    throw err
  }
  return found
}

async function create(payload) {
  const exists = blueprints.some((bp) => bp.author === payload.author && bp.name === payload.name)
  if (exists) {
    const err = new Error(`Ya existe un blueprint '${payload.name}' de '${payload.author}' (mock)`)
    err.status = 409
    throw err
  }
  const created = { author: payload.author, name: payload.name, points: payload.points ?? [] }
  blueprints = [...blueprints, created]
  return created
}

async function update(author, name, points) {
  await getByAuthorAndName(author, name) // lanza 404 si no existe
  const updated = { author, name, points }
  blueprints = blueprints.map((bp) => (bp.author === author && bp.name === name ? updated : bp))
  return updated
}

async function remove(author, name) {
  await getByAuthorAndName(author, name) // lanza 404 si no existe
  blueprints = blueprints.filter((bp) => !(bp.author === author && bp.name === name))
}

export default { getAll, getByAuthor, getByAuthorAndName, create, update, remove }
