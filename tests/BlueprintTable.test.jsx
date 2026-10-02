import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BlueprintTable from '../src/components/BlueprintTable.jsx'
import { LoadStatus } from '../src/hooks/useAuthorBlueprints.js'

const items = [
  { author: 'john', name: 'garage', points: [{ x: 0, y: 0 }] },
  {
    author: 'john',
    name: 'house',
    points: [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
  },
]

describe('BlueprintTable', () => {
  it('lists the blueprints of the author with the total of points', () => {
    render(<BlueprintTable author="john" items={items} status={LoadStatus.IDLE} onOpen={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Planos de john' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByLabelText('Total de puntos')).toHaveTextContent('3')
  })

  it('opens the chosen blueprint', () => {
    const onOpen = vi.fn()
    render(<BlueprintTable author="john" items={items} status={LoadStatus.IDLE} onOpen={onOpen} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[1])

    expect(onOpen).toHaveBeenCalledWith('house')
  })

  it('offers a retry when loading fails', () => {
    const onRetry = vi.fn()
    render(
      <BlueprintTable
        author="john"
        items={[]}
        status={LoadStatus.FAILED}
        error="backend apagado"
        onRetry={onRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('backend apagado')
    expect(onRetry).toHaveBeenCalled()
  })
})
