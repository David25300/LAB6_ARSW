import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BlueprintForm from '../src/components/BlueprintForm.jsx'

describe('BlueprintForm', () => {
  it('envía el formulario con puntos parseados', () => {
    const onSubmit = vi.fn()
    render(<BlueprintForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Autor/i), { target: { value: 'john' } })
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'house' } })
    fireEvent.change(screen.getByLabelText(/Puntos/i), {
      target: { value: '[{"x":1,"y":2}]' },
    })
    fireEvent.submit(screen.getByText(/Guardar/i))

    expect(onSubmit).toHaveBeenCalledWith({
      author: 'john',
      name: 'house',
      points: [{ x: 1, y: 2 }],
    })
  })

  it('con JSON inválido muestra el error y no envía', () => {
    const onSubmit = vi.fn()
    render(<BlueprintForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Puntos/i), { target: { value: '[{x:1' } })
    fireEvent.submit(screen.getByText(/Guardar/i))

    expect(screen.getByRole('alert')).toHaveTextContent('JSON de puntos inválido')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('exige que los puntos sean un arreglo', () => {
    const onSubmit = vi.fn()
    render(<BlueprintForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Puntos/i), { target: { value: '{"x":1,"y":2}' } })
    fireEvent.submit(screen.getByText(/Guardar/i))

    expect(screen.getByRole('alert')).toHaveTextContent(/arreglo/)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('al hacer clic en el lienzo agrega el punto; Deshacer y Limpiar lo quitan', () => {
    const onSubmit = vi.fn()
    render(<BlueprintForm onSubmit={onSubmit} />)
    const canvas = document.getElementById('blueprint-canvas')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 520, height: 360 })
    const json = screen.getByLabelText(/Puntos/i)

    fireEvent.click(canvas, { detail: 1, clientX: 100, clientY: 50 })
    expect(json).toHaveValue('[{"x":10,"y":10},{"x":40,"y":60},{"x":100,"y":50}]')

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer punto' }))
    expect(json).toHaveValue('[{"x":10,"y":10},{"x":40,"y":60}]')

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(json).toHaveValue('[]')

    fireEvent.click(canvas, { detail: 1, clientX: 7, clientY: 8 })
    fireEvent.change(screen.getByLabelText(/Autor/i), { target: { value: 'john' } })
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'dibujo' } })
    fireEvent.submit(screen.getByText(/Guardar/i))
    expect(onSubmit).toHaveBeenCalledWith({
      author: 'john',
      name: 'dibujo',
      points: [{ x: 7, y: 8 }],
    })
  })

  it('con JSON inválido no deja dibujar', () => {
    render(<BlueprintForm onSubmit={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Puntos/i), { target: { value: '[{x' } })
    fireEvent.click(document.getElementById('blueprint-canvas'), { clientX: 1, clientY: 1 })
    expect(screen.getByRole('alert')).toHaveTextContent('Corrige el JSON')
    expect(screen.getByLabelText(/Puntos/i)).toHaveValue('[{x')
  })

  it('en modo edición carga el plano y no deja cambiar autor ni nombre', () => {
    const bp = { author: 'john', name: 'house', points: [{ x: 1, y: 2 }] }
    render(<BlueprintForm onSubmit={vi.fn()} initial={bp} editing />)
    expect(screen.getByRole('heading', { name: 'Editar Blueprint' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Autor/i)).toHaveValue('john')
    expect(screen.getByLabelText(/Autor/i)).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/Nombre/i)).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/Puntos/i)).toHaveValue('[{"x":1,"y":2}]')
  })

  it('mientras guarda deshabilita el botón', () => {
    render(<BlueprintForm onSubmit={vi.fn()} submitting />)
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
  })
})
