import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  it('shows the academic agenda heading and deadlines section', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Agenda Acadêmica' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Prazos acadêmicos' }),
    ).toBeInTheDocument()
  })
})
