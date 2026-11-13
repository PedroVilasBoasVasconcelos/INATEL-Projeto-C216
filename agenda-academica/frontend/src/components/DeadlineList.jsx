const STATUS_LABELS = {
  pending: 'Pendente',
  overdue: 'Atrasado',
  completed: 'Concluído',
}

const PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function DeadlineList({
  deadlines,
  loading,
  onEdit,
  onDelete,
  onStatusChange,
  hasDeadlines,
  onClearSearch,
}) {
  if (loading && deadlines.length === 0) {
    return (
      <div className="list-state" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        Carregando seus prazos...
      </div>
    )
  }

  if (deadlines.length === 0) {
    return (
      <div className="list-state empty-state">
        <span className="empty-icon" aria-hidden="true">
          ✓
        </span>
        <h3>
          {hasDeadlines ? 'Nenhum prazo encontrado' : 'Sua agenda começa aqui'}
        </h3>
        <p>
          {hasDeadlines
            ? 'Tente mudar os filtros ou a busca.'
            : 'Adicione sua primeira atividade usando o formulário ao lado.'}
        </p>
        {hasDeadlines && (
          <button className="text-button" type="button" onClick={onClearSearch}>
            Limpar filtros
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="deadline-list" aria-live="polite">
      {deadlines.map((deadline) => (
        <article className="deadline-item" key={deadline.id}>
          <div
            className={`deadline-date-mark mark-${deadline.status}`}
            aria-hidden="true"
          >
            <span>{new Date(`${deadline.due_date}T12:00:00`).getDate()}</span>
            <small>
              {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                .format(new Date(`${deadline.due_date}T12:00:00`))
                .replace('.', '')}
            </small>
          </div>
          <div className="deadline-main">
            <div className="deadline-title-row">
              <h3>{deadline.title}</h3>
              <span className={`status-badge status-${deadline.status}`}>
                <span className="status-dot" aria-hidden="true" />
                {STATUS_LABELS[deadline.status]}
              </span>
            </div>
            <div className="deadline-meta">
              <span className="course-tag">{deadline.course}</span>
              <span>
                {DATE_FORMAT.format(new Date(`${deadline.due_date}T12:00:00`))}
              </span>
              <span className={`priority-label priority-${deadline.priority}`}>
                Prioridade {PRIORITY_LABELS[deadline.priority]}
              </span>
            </div>
            {deadline.description && (
              <p className="deadline-description">{deadline.description}</p>
            )}
          </div>
          <div className="deadline-actions">
            {deadline.status !== 'completed' ? (
              <button
                type="button"
                className="icon-button complete-button"
                aria-label={`Marcar ${deadline.title} como concluído`}
                title="Marcar como concluído"
                onClick={() => onStatusChange(deadline, 'completed')}
              >
                ✓
              </button>
            ) : (
              <button
                type="button"
                className="icon-button"
                aria-label={`Reabrir ${deadline.title}`}
                title="Reabrir prazo"
                onClick={() => onStatusChange(deadline, 'pending')}
              >
                ↶
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label={`Editar ${deadline.title}`}
              title="Editar prazo"
              onClick={() => onEdit(deadline)}
            >
              ✎
            </button>
            <button
              type="button"
              className="icon-button delete-button"
              aria-label={`Excluir ${deadline.title}`}
              title="Excluir prazo"
              onClick={() => onDelete(deadline)}
            >
              ×
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

export default DeadlineList
