import { cleanup, render, screen } from '@testing-library/react'
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
})
