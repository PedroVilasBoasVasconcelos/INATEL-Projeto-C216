import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('shows the academic agenda heading and deadlines section', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Organize seus prazos.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Seus prazos' }),
    ).toBeInTheDocument()
  })

  it('switches to dark theme and remembers the preference', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Ativar tema escuro' }))

    expect(
      screen.getByRole('button', { name: 'Ativar tema claro' }),
    ).toBeInTheDocument()
    expect(document.querySelector('.app-shell')).toHaveAttribute(
      'data-theme',
      'dark',
    )
    expect(window.localStorage.getItem('agenda-theme')).toBe('dark')
  })

  it('restores the saved theme when the app is opened again', () => {
    window.localStorage.setItem('agenda-theme', 'dark')

    render(<App />)

    expect(document.querySelector('.app-shell')).toHaveAttribute(
      'data-theme',
      'dark',
    )
    expect(
      screen.getByRole('button', { name: 'Ativar tema claro' }),
    ).toBeInTheDocument()
  })

  it('filters the loaded deadlines by status and search text', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 1,
          title: 'Trabalho de redes',
          description: null,
          course: 'C207',
          due_date: '2026-11-20',
          priority: 'high',
          status: 'pending',
        },
        {
          id: 2,
          title: 'Prova de cálculo',
          description: null,
          course: 'MAT',
          due_date: '2026-11-21',
          priority: 'medium',
          status: 'completed',
        },
      ],
    })
    const user = userEvent.setup()
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Trabalho de redes' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluídos' }))

    expect(
      screen.getByRole('heading', { name: 'Prova de cálculo' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Trabalho de redes' }),
    ).not.toBeInTheDocument()

    await user.type(
      screen.getByPlaceholderText('Buscar atividade...'),
      'Cálculo',
    )
    expect(
      screen.getByRole('heading', { name: 'Prova de cálculo' }),
    ).toBeInTheDocument()
  })

  it('submits a new deadline to the API and shows success feedback', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/Nome da atividade/), 'Trabalho C216')
    await user.type(screen.getByLabelText(/Disciplina/), 'C216')
    await user.type(screen.getByLabelText(/Data de entrega/), '25112026')
    await user.click(screen.getByRole('button', { name: 'Adicionar prazo' }))

    await screen.findByRole('status')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/deadlines',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"due_date":"2026-11-25"'),
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Prazo adicionado à sua agenda.',
    )
  })

  it('shows an API error and lets the user retry loading deadlines', async () => {
    fetch
      .mockRejectedValueOnce(new Error('Falha de conexão'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      })
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar à API.',
    )
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Sua agenda começa aqui')).toBeInTheDocument()
  })

  it('sends a status update for a deadline', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 1,
          title: 'Trabalho de redes',
          description: null,
          course: 'C207',
          due_date: '2026-11-20',
          priority: 'high',
          status: 'pending',
        },
      ],
    })
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Trabalho de redes' })
    await user.click(
      screen.getByRole('button', {
        name: 'Marcar Trabalho de redes como concluído',
      }),
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/deadlines/1/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        }),
      )
    })
  })
})
