import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DeadlineForm from './DeadlineForm.jsx'

afterEach(cleanup)

async function fillRequiredFields(user) {
  await user.type(screen.getByLabelText(/Nome da atividade/), 'Trabalho C216')
  await user.type(screen.getByLabelText(/Disciplina/), 'C216')
  await user.type(screen.getByLabelText(/Data de entrega/), '25112026')
}

describe('DeadlineForm', () => {
  it('accepts a Brazilian date and sends ISO format to the API', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <DeadlineForm
        deadline={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        saving={false}
      />,
    )

    await fillRequiredFields(user)
    expect(screen.getByLabelText(/Data de entrega/)).toHaveValue('25/11/2026')
    await user.click(screen.getByRole('button', { name: 'Adicionar prazo' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ due_date: '2026-11-25' }),
    )
  })

  it('rejects impossible dates before submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <DeadlineForm
        deadline={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        saving={false}
      />,
    )

    await user.type(screen.getByLabelText(/Nome da atividade/), 'Trabalho C216')
    await user.type(screen.getByLabelText(/Disciplina/), 'C216')
    await user.type(screen.getByLabelText(/Data de entrega/), '31022026')
    await user.click(screen.getByRole('button', { name: 'Adicionar prazo' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe uma data válida no formato DD/MM/AAAA.',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps entered values visible when the API rejects the request', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Falha ao salvar.'))
    render(
      <DeadlineForm
        deadline={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        saving={false}
      />,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Adicionar prazo' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar.')
    expect(screen.getByLabelText(/Nome da atividade/)).toHaveValue(
      'Trabalho C216',
    )
    expect(screen.getByLabelText(/Data de entrega/)).toHaveValue('25/11/2026')
  })

  it('formats an existing ISO date as Brazilian when editing', () => {
    render(
      <DeadlineForm
        deadline={{
          id: 1,
          title: 'Trabalho C216',
          course: 'C216',
          due_date: '2026-11-25',
          priority: 'medium',
          description: null,
          status: 'pending',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
      />,
    )

    expect(screen.getByLabelText(/Data de entrega/)).toHaveValue('25/11/2026')
  })

  it('updates the Brazilian date when a date is selected from the calendar', () => {
    const { container } = render(
      <DeadlineForm
        deadline={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
      />,
    )

    fireEvent.change(container.querySelector('.date-picker-input'), {
      target: { value: '2026-11-25' },
    })

    expect(screen.getByLabelText(/Data de entrega/)).toHaveValue('25/11/2026')
  })
})
