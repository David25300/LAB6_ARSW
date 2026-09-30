import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import blueprintsService from '../../services/blueprintsService.js'

// GET /blueprints: catalogo completo, del que se derivan autores y top-5 (ver selectores abajo)
export const fetchAll = createAsyncThunk('blueprints/fetchAll', async () => {
  return blueprintsService.getAll()
})

export const fetchByAuthor = createAsyncThunk('blueprints/fetchByAuthor', async (author) => {
  const items = await blueprintsService.getByAuthor(author)
  return { author, items }
})

export const fetchBlueprint = createAsyncThunk(
  'blueprints/fetchBlueprint',
  async ({ author, name }) => {
    const data = await blueprintsService.getByAuthorAndName(author, name)
    return data
  },
)

export const createBlueprint = createAsyncThunk('blueprints/createBlueprint', async (payload) => {
  const data = await blueprintsService.create(payload)
  return data
})

// PUT y DELETE son optimistas: el estado cambia en `pending` y se revierte en `rejected`
export const updateBlueprint = createAsyncThunk(
  'blueprints/updateBlueprint',
  async ({ author, name, points }) => blueprintsService.update(author, name, points),
)

export const removeBlueprint = createAsyncThunk(
  'blueprints/removeBlueprint',
  async ({ author, name }) => {
    await blueprintsService.remove(author, name)
  },
)

// Cada thunk tiene su propio status/error, asi un fallo al abrir un plano
// no borra ni tapa el estado de la lista (y cada zona de la UI puede reintentar lo suyo).
const REQUESTS = ['all', 'byAuthor', 'current', 'create', 'update', 'remove']
const byRequest = (value) => Object.fromEntries(REQUESTS.map((key) => [key, value]))

const start = (s, key) => {
  s.status[key] = 'loading'
  s.error[key] = null
}
const succeed = (s, key) => {
  s.status[key] = 'succeeded'
}
const fail = (s, key, a) => {
  s.status[key] = 'failed'
  s.error[key] = a.error.message
}

const isSame = (author, name) => (bp) => bp.author === author && bp.name === name

// Lista de planos del autor, creandola si aun no existe
const listOf = (byAuthor, author) => {
  byAuthor[author] ??= []
  return byAuthor[author]
}

// Reemplaza el plano (mismo autor y nombre) en la lista de su autor y en `current`
const replaceBlueprint = (s, bp) => {
  const list = s.byAuthor[bp.author] || []
  const i = list.findIndex(isSame(bp.author, bp.name))
  if (i >= 0) list[i] = bp
  if (s.current && isSame(bp.author, bp.name)(s.current)) s.current = bp
}

const slice = createSlice({
  name: 'blueprints',
  initialState: {
    byAuthor: {},
    current: null,
    status: byRequest('idle'),
    error: byRequest(null),
    // Copias de lo que habia antes de cada cambio optimista, por requestId, para poder revertir
    rollback: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (s) => start(s, 'all'))
      .addCase(fetchAll.fulfilled, (s, a) => {
        succeed(s, 'all')
        const catalog = {}
        for (const bp of Array.isArray(a.payload) ? a.payload : []) {
          listOf(catalog, bp.author).push(bp)
        }
        // Solo completa autores que aun no estan cargados: si una consulta por autor o un cambio
        // optimista llego antes que el catalogo, es mas reciente y no se debe pisar
        for (const [author, list] of Object.entries(catalog)) {
          if (!s.byAuthor[author]) s.byAuthor[author] = list
        }
      })
      .addCase(fetchAll.rejected, (s, a) => fail(s, 'all', a))
      .addCase(fetchByAuthor.pending, (s) => start(s, 'byAuthor'))
      .addCase(fetchByAuthor.fulfilled, (s, a) => {
        succeed(s, 'byAuthor')
        // Defensa extra: si por algun motivo no llega un array, no rompemos la UI
        s.byAuthor[a.payload.author] = Array.isArray(a.payload.items) ? a.payload.items : []
      })
      .addCase(fetchByAuthor.rejected, (s, a) => fail(s, 'byAuthor', a))
      .addCase(fetchBlueprint.pending, (s) => start(s, 'current'))
      .addCase(fetchBlueprint.fulfilled, (s, a) => {
        succeed(s, 'current')
        s.current = a.payload
      })
      .addCase(fetchBlueprint.rejected, (s, a) => fail(s, 'current', a))
      .addCase(createBlueprint.pending, (s) => start(s, 'create'))
      .addCase(createBlueprint.fulfilled, (s, a) => {
        succeed(s, 'create')
        listOf(s.byAuthor, a.payload.author).push(a.payload)
      })
      .addCase(createBlueprint.rejected, (s, a) => fail(s, 'create', a))
      .addCase(updateBlueprint.pending, (s, a) => {
        start(s, 'update')
        const { author, name, points } = a.meta.arg
        const find = isSame(author, name)
        const previous =
          (s.byAuthor[author] || []).find(find) || (s.current && find(s.current) ? s.current : null)
        s.rollback[a.meta.requestId] = previous
        replaceBlueprint(s, { author, name, points })
      })
      .addCase(updateBlueprint.fulfilled, (s, a) => {
        succeed(s, 'update')
        delete s.rollback[a.meta.requestId]
        if (a.payload) replaceBlueprint(s, a.payload)
      })
      .addCase(updateBlueprint.rejected, (s, a) => {
        fail(s, 'update', a)
        const previous = s.rollback[a.meta.requestId]
        delete s.rollback[a.meta.requestId]
        if (previous) replaceBlueprint(s, previous)
      })
      .addCase(removeBlueprint.pending, (s, a) => {
        start(s, 'remove')
        const { author, name } = a.meta.arg
        const find = isSame(author, name)
        const list = s.byAuthor[author] || []
        const index = list.findIndex(find)
        const current = s.current && find(s.current) ? s.current : null
        s.rollback[a.meta.requestId] = { blueprint: list[index] ?? null, index, current }
        if (index >= 0) list.splice(index, 1)
        if (current) s.current = null
      })
      .addCase(removeBlueprint.fulfilled, (s, a) => {
        succeed(s, 'remove')
        delete s.rollback[a.meta.requestId]
      })
      .addCase(removeBlueprint.rejected, (s, a) => {
        fail(s, 'remove', a)
        const { blueprint, index, current } = s.rollback[a.meta.requestId] || {}
        delete s.rollback[a.meta.requestId]
        if (blueprint) listOf(s.byAuthor, blueprint.author).splice(index, 0, blueprint)
        if (current) s.current = current
      })
  },
})

export default slice.reducer

// ---- Selectores memoizados: solo se recalculan cuando cambia `byAuthor` ----
const selectByAuthor = (state) => state.blueprints.byAuthor
const pointsOf = (bp) => bp.points?.length || 0

export const selectAuthors = createSelector([selectByAuthor], (byAuthor) =>
  Object.keys(byAuthor).filter((author) => byAuthor[author].length > 0),
)

export const selectTop5 = createSelector([selectByAuthor], (byAuthor) =>
  Object.values(byAuthor)
    .flat()
    .sort((a, b) => pointsOf(b) - pointsOf(a))
    .slice(0, 5),
)
