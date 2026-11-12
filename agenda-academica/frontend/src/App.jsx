import { useCallback, useEffect, useMemo, useState } from 'react'
import DeadlineForm from './components/DeadlineForm.jsx'
import DeadlineList from './components/DeadlineList.jsx'
import { deadlinesApi } from './services/deadlines.js'

const FILTERS = [
  { value: 'all', label: 'Todos os prazos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'overdue', label: 'Atrasados' },
  { value: 'completed', label: 'Concluídos' },
]

function App() {
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem('agenda-theme') || 'light',
  )
  const [deadlines, setDeadlines] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editingDeadline, setEditingDeadline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    window.localStorage.setItem('agenda-theme', theme)
  }, [theme])

  const loadDeadlines = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const result = await deadlinesApi.list({ signal })
      setDeadlines(result)
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message)
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadDeadlines(controller.signal)
    return () => controller.abort()
  }, [loadDeadlines])

  const visibleDeadlines = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
    return deadlines.filter((deadline) => {
      const matchesFilter = filter === 'all' || deadline.status === filter
      const matchesSearch =
        !normalizedSearch ||
        `${deadline.title} ${deadline.course} ${deadline.description ?? ''}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })
  }, [deadlines, filter, search])

  const summary = useMemo(
    () => ({
      total: deadlines.length,
      pending: deadlines.filter((deadline) => deadline.status === 'pending')
        .length,
      overdue: deadlines.filter((deadline) => deadline.status === 'overdue')
        .length,
      completed: deadlines.filter((deadline) => deadline.status === 'completed')
        .length,
    }),
    [deadlines],
  )

  async function handleSave(payload) {
    setSaving(true)
    setError('')
    try {
      if (editingDeadline) {
        await deadlinesApi.update(editingDeadline.id, payload)
        setNotice('Prazo atualizado com sucesso.')
      } else {
        await deadlinesApi.create(payload)
        setNotice('Prazo adicionado à sua agenda.')
      }
      setEditingDeadline(null)
      await loadDeadlines()
    } catch (requestError) {
      setError(requestError.message)
      throw requestError
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(deadline, status) {
    setError('')
    try {
      await deadlinesApi.updateStatus(deadline.id, status)
      setNotice(
        status === 'completed'
          ? 'Prazo marcado como concluído.'
          : 'Prazo reaberto.',
      )
      await loadDeadlines()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleDelete(deadline) {
    if (
      !window.confirm(
        `Excluir o prazo "${deadline.title}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }
    setError('')
    try {
      await deadlinesApi.remove(deadline.id)
      setNotice('Prazo excluído.')
      if (editingDeadline?.id === deadline.id) setEditingDeadline(null)
      await loadDeadlines()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function startEditing(deadline) {
    setNotice('')
    setEditingDeadline(deadline)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEditing() {
    setEditingDeadline(null)
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Agenda Acadêmica - início">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            agenda<span className="brand-light">.acadêmica</span>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="topbar-course">C216 · Projeto Final</span>
          <button
            type="button"
            className="theme-toggle"
            aria-label={
              theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
            }
            title={
              theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
            }
            onClick={() =>
              setTheme((current) => (current === 'light' ? 'dark' : 'light'))
            }
          >
            <span key={theme} className="theme-toggle-icon" aria-hidden="true">
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M20.2 15.4A8.6 8.6 0 0 1 8.6 3.8 8.7 8.7 0 1 0 20.2 15.4Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
            <span className="theme-toggle-label">
              {theme === 'light' ? 'Escuro' : 'Claro'}
            </span>
          </button>
        </div>
      </header>

      <main className="page-content">
        <section className="welcome">
          <div>
            <p className="eyebrow">SEU SEMESTRE, EM DIA</p>
            <h1>Organize seus prazos.</h1>
            <p className="welcome-copy">
              Acompanhe trabalhos, provas e entregas em um só lugar.
            </p>
          </div>
          <div className="welcome-date">
            <span className="welcome-date-label">HOJE</span>
            <strong>
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
            </strong>
          </div>
        </section>

        {error && (
          <div className="feedback feedback-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="feedback-action"
              onClick={() => loadDeadlines()}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {notice && (
          <div className="feedback feedback-success" role="status">
            <span>{notice}</span>
            <button
              type="button"
              className="feedback-dismiss"
              aria-label="Fechar mensagem"
              onClick={() => setNotice('')}
            >
              ×
            </button>
          </div>
        )}

        <section className="summary-grid" aria-label="Resumo dos prazos">
          <SummaryCard
            label="Total de prazos"
            value={summary.total}
            tone="purple"
          />
          <SummaryCard label="Pendentes" value={summary.pending} tone="blue" />
          <SummaryCard label="Atrasados" value={summary.overdue} tone="red" />
          <SummaryCard
            label="Concluídos"
            value={summary.completed}
            tone="green"
          />
        </section>

        <div className="workspace-grid">
          <section className="panel form-panel" aria-labelledby="form-title">
            <div className="panel-heading">
              <span className="panel-icon" aria-hidden="true">
                {editingDeadline ? (
                  '↗'
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </span>
              <div>
                <h2 id="form-title">
                  {editingDeadline ? 'Editar prazo' : 'Novo prazo'}
                </h2>
                <p>
                  {editingDeadline
                    ? 'Atualize os dados da atividade.'
                    : 'Adicione uma atividade à sua agenda.'}
                </p>
              </div>
            </div>
            <DeadlineForm
              key={editingDeadline?.id ?? 'new'}
              deadline={editingDeadline}
              onSubmit={handleSave}
              onCancel={cancelEditing}
              saving={saving}
            />
          </section>

          <section
            className="panel deadlines-panel"
            aria-labelledby="deadlines-title"
          >
            <div className="deadlines-heading">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">VISÃO GERAL</p>
                  <h2 id="deadlines-title">Seus prazos</h2>
                </div>
              </div>
              <label className="search-field">
                <span className="search-icon" aria-hidden="true">
                  ⌕
                </span>
                <span className="sr-only">
                  Buscar por atividade ou disciplina
                </span>
                <input
                  type="search"
                  placeholder="Buscar atividade..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>

            <fieldset className="filter-tabs">
              <legend className="sr-only">Filtrar prazos</legend>
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`filter-tab${filter === item.value ? ' is-active' : ''}`}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </fieldset>

            <DeadlineList
              deadlines={visibleDeadlines}
              loading={loading}
              onEdit={startEditing}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              hasDeadlines={deadlines.length > 0}
              onClearSearch={() => {
                setFilter('all')
                setSearch('')
              }}
            />
          </section>
        </div>
      </main>
      <footer className="footer">
        <span>Agenda Acadêmica</span>
        <span>Feita para deixar sua rotina mais leve.</span>
      </footer>
    </div>
  )
}

function SummaryCard({ label, value, tone }) {
  return (
    <article className={`summary-card summary-${tone}`}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </article>
  )
}

export default App
