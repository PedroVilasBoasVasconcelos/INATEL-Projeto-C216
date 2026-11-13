import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

function apiResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function makeDeadline(id, title, status, overrides = {}) {
  return {
    id,
    title,
    description: null,
    course: 'C216',
    due_date: '2026-11-25',
    priority: 'medium',
    status,
    ...overrides,
  }
}

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
    vi.restoreAllMocks()
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

    await screen.findByText('Prazo adicionado à sua agenda.')
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

  it('updates the visible deadline status after the API confirms it', async () => {
    const pendingDeadline = {
      id: 1,
      title: 'Trabalho de redes',
      description: null,
      course: 'C207',
      due_date: '2026-11-20',
      priority: 'high',
      status: 'pending',
    }
    const completedDeadline = { ...pendingDeadline, status: 'completed' }
    fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [pendingDeadline],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => completedDeadline,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [completedDeadline],
      })
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Trabalho de redes' })
    await user.click(
      screen.getByRole('button', {
        name: 'Marcar Trabalho de redes como concluído',
      }),
    )

    expect(await screen.findByText('Concluído')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reabrir Trabalho de redes' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Marcar Trabalho de redes como concluído',
      }),
    ).not.toBeInTheDocument()
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/deadlines/1/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/deadlines?limit=100',
      expect.objectContaining({ headers: {} }),
    )
  })

  it('shows summary counts from the loaded deadlines', async () => {
    fetch.mockResolvedValueOnce(
      apiResponse([
        makeDeadline(1, 'Pendente', 'pending'),
        makeDeadline(2, 'Atrasado', 'overdue'),
        makeDeadline(3, 'Concluído', 'completed'),
      ]),
    )
    render(<App />)

    const summary = await screen.findByRole('region', {
      name: 'Resumo dos prazos',
    })
    const cards = within(summary).getAllByRole('article')
    const labels = cards.map(
      (card) => card.querySelector('.summary-label').textContent,
    )
    const values = cards.map(
      (card) => card.querySelector('.summary-value').textContent,
    )

    expect(labels).toEqual([
      'Total de prazos',
      'Pendentes',
      'Atrasados',
      'Concluídos',
    ])
    expect(values).toEqual(['3', '1', '1', '1'])
  })

  it('filters pending deadlines without showing completed or overdue items', async () => {
    fetch.mockResolvedValueOnce(
      apiResponse([
        makeDeadline(1, 'Pendente atual', 'pending'),
        makeDeadline(2, 'Prazo atrasado', 'overdue'),
        makeDeadline(3, 'Prazo concluído', 'completed'),
      ]),
    )
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Pendente atual' })
    await user.click(screen.getByRole('button', { name: 'Pendentes' }))

    expect(
      screen.getByRole('heading', { name: 'Pendente atual' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Prazo atrasado' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Prazo concluído' }),
    ).not.toBeInTheDocument()
  })

  it('filters only overdue deadlines', async () => {
    fetch.mockResolvedValueOnce(
      apiResponse([
        makeDeadline(1, 'Pendente futuro', 'pending'),
        makeDeadline(2, 'Prazo vencido', 'overdue'),
      ]),
    )
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Pendente futuro' })
    await user.click(screen.getByRole('button', { name: 'Atrasados' }))

    expect(
      screen.getByRole('heading', { name: 'Prazo vencido' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Pendente futuro' }),
    ).not.toBeInTheDocument()
  })

  it('clears the search when the user asks to clear filters', async () => {
    fetch.mockResolvedValueOnce(
      apiResponse([makeDeadline(1, 'Trabalho de redes', 'pending')]),
    )
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Trabalho de redes' })
    await user.type(
      screen.getByPlaceholderText('Buscar atividade...'),
      'inexistente',
    )
    expect(
      await screen.findByText('Nenhum prazo encontrado'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(
      screen.getByRole('heading', { name: 'Trabalho de redes' }),
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar atividade...')).toHaveValue('')
  })

  it('saves edited deadline fields and displays the refreshed API result', async () => {
    const original = makeDeadline(7, 'Trabalho de redes', 'pending')
    const updated = makeDeadline(7, 'Trabalho revisado', 'pending', {
      course: 'C216 avançado',
      description: 'Versão final',
      priority: 'high',
    })
    fetch
      .mockResolvedValueOnce(apiResponse([original]))
      .mockResolvedValueOnce(apiResponse(updated))
      .mockResolvedValueOnce(apiResponse([updated]))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Trabalho de redes' })
    await user.click(
      screen.getByRole('button', { name: 'Editar Trabalho de redes' }),
    )
    await user.clear(screen.getByLabelText(/Nome da atividade/))
    await user.type(screen.getByLabelText(/Nome da atividade/), updated.title)
    await user.clear(screen.getByLabelText(/Disciplina/))
    await user.type(screen.getByLabelText(/Disciplina/), updated.course)
    await user.selectOptions(screen.getByLabelText('Prioridade'), 'high')
    await user.type(
      screen.getByPlaceholderText('Anotações ou detalhes importantes...'),
      updated.description,
    )
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByRole('heading', { name: updated.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('Versão final')).toBeInTheDocument()
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/deadlines/7',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          title: updated.title,
          course: updated.course,
          due_date: '2026-11-25',
          priority: 'high',
          description: updated.description,
          status: 'pending',
        }),
      }),
    )
  })

  it('cancels editing without sending an update', async () => {
    fetch.mockResolvedValueOnce(
      apiResponse([makeDeadline(4, 'Prova de cálculo', 'pending')]),
    )
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Prova de cálculo' })
    await user.click(
      screen.getByRole('button', { name: 'Editar Prova de cálculo' }),
    )
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('heading', { name: 'Novo prazo' }),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps a deadline when the delete confirmation is cancelled', async () => {
    fetch.mockResolvedValueOnce(
      apiResponse([makeDeadline(5, 'Relatório de laboratório', 'pending')]),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Relatório de laboratório' })
    await user.click(
      screen.getByRole('button', { name: 'Excluir Relatório de laboratório' }),
    )

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('heading', { name: 'Relatório de laboratório' }),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('deletes a confirmed deadline and refreshes the empty state', async () => {
    fetch
      .mockResolvedValueOnce(
        apiResponse([makeDeadline(6, 'Entrega para excluir', 'pending')]),
      )
      .mockResolvedValueOnce(apiResponse(null, 204))
      .mockResolvedValueOnce(apiResponse([]))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Entrega para excluir' })
    await user.click(
      screen.getByRole('button', { name: 'Excluir Entrega para excluir' }),
    )

    expect(
      await screen.findByText('Sua agenda começa aqui'),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/deadlines/6',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
