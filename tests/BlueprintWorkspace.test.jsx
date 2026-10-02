import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BlueprintWorkspace from '../src/components/BlueprintWorkspace.jsx'
import { UpdateMode } from '../src/realtime/realtimeTypes.js'
import { createFakeTransport, jsonResponse } from './fakes.js'

const realtime = vi.hoisted(() => ({ transport: null }))

vi.mock('../src/realtime/transports.js', async (importOriginal) => ({
  ...(await importOriginal()),
  createTransport: () => realtime.transport,
}))

const house = { author: 'john', name: 'house', points: [{ x: 1, y: 1 }] }
const fetchMock = vi.fn()

function routeFetch(routes) {
  fetchMock.mockImplementation(async (url, { method = 'GET' } = {}) => {
    const path = new URL(url).pathname
    const handler = routes[`${method} ${path}`]
    return handler ? handler() : jsonResponse(404, { message: `Not found: ${path}` })
  })
}

function requestsTo(method, path) {
  return fetchMock.mock.calls.filter(
    ([url, options = {}]) => (options.method ?? 'GET') === method && new URL(url).pathname === path,
  )
}

async function openBlueprint(author, name) {
  fireEvent.change(screen.getByLabelText('Autor'), { target: { value: author } })
  fireEvent.change(screen.getByLabelText('Plano'), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  await screen.findByRole('heading', { name: `${author} / ${name}` })
}

function clickCanvas(x, y) {
  const canvas = screen.getByLabelText('Lienzo del plano')
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400 })
  fireEvent.click(canvas, { clientX: x, clientY: y })
}

beforeEach(() => {
  realtime.transport = createFakeTransport()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('BlueprintWorkspace', () => {
  it('collaborates on a saved blueprint and keeps the author total up to date', async () => {
    routeFetch({
      'GET /api/v1/blueprints/john': () => jsonResponse(200, { data: [house] }),
      'GET /api/v1/blueprints/john/house': () => jsonResponse(200, { data: house }),
      'PUT /api/v1/blueprints/john/house': () => jsonResponse(200, { data: house }),
    })
    render(<BlueprintWorkspace token="t" />)

    await openBlueprint('john', 'house')
    await waitFor(() => expect(screen.getByLabelText('Total de puntos')).toHaveTextContent('1'))

    clickCanvas(10, 20)
    expect(realtime.transport.publish).toHaveBeenCalledWith('john', 'house', { x: 10, y: 20 })

    act(() =>
      realtime.transport.emit({
        author: 'john',
        name: 'house',
        points: [...house.points, { x: 10, y: 20 }, { x: 30, y: 40 }],
        mode: UpdateMode.REPLACE,
      }),
    )
    expect(screen.getByLabelText('Total de puntos')).toHaveTextContent('3')
    expect(screen.getByText('3 puntos · guardado')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save/Update' }))
    await screen.findByText('Plano "house" guardado con 3 puntos.')
    const [[, saveRequest]] = requestsTo('PUT', '/api/v1/blueprints/john/house')
    expect(JSON.parse(saveRequest.body).points).toHaveLength(3)
  })

  it('creates a new blueprint from a local draft', async () => {
    routeFetch({
      'GET /api/v1/blueprints/john': () => jsonResponse(200, { data: [] }),
      'POST /api/v1/blueprints': () => jsonResponse(201, { data: {} }),
    })
    render(<BlueprintWorkspace token="t" />)

    await openBlueprint('john', 'patio')
    expect(screen.getByRole('button', { name: 'Save/Update' })).toBeDisabled()

    clickCanvas(5, 5)
    expect(realtime.transport.publish).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByText('Plano "patio" creado.')

    const [[, createRequest]] = requestsTo('POST', '/api/v1/blueprints')
    expect(JSON.parse(createRequest.body)).toEqual({
      author: 'john',
      name: 'patio',
      points: [{ x: 5, y: 5 }],
    })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it('deletes the open blueprint', async () => {
    routeFetch({
      'GET /api/v1/blueprints/john': () => jsonResponse(200, { data: [house] }),
      'GET /api/v1/blueprints/john/house': () => jsonResponse(200, { data: house }),
      'DELETE /api/v1/blueprints/john/house': () => jsonResponse(200, { data: null }),
    })
    render(<BlueprintWorkspace token="t" />)
    await openBlueprint('john', 'house')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await screen.findByText('Plano "house" eliminado.')
    expect(requestsTo('DELETE', '/api/v1/blueprints/john/house')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled()
  })
})
