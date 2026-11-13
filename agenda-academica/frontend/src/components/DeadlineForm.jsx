import { useRef, useState } from 'react'
import {
  formatDateForInput,
  formatDateInput,
  parseBrazilianDate,
} from '../services/dates.js'

function DeadlineForm({ deadline, onSubmit, onCancel, saving }) {
  const datePickerRef = useRef(null)
  const [formError, setFormError] = useState('')
  const [values, setValues] = useState(() => ({
    title: deadline?.title ?? '',
    course: deadline?.course ?? '',
    due_date: formatDateForInput(deadline?.due_date),
    priority: deadline?.priority ?? 'medium',
    description: deadline?.description ?? '',
    status: deadline?.status === 'completed' ? 'completed' : 'pending',
  }))

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({
      ...current,
      [name]: name === 'due_date' ? formatDateInput(value) : value,
    }))
  }

  function updateFromCalendar(event) {
    const { value } = event.target
    setValues((current) => ({
      ...current,
      due_date: formatDateForInput(value),
    }))
  }

  function openCalendar() {
    const datePicker = datePickerRef.current
    if (!datePicker) return

    if (typeof datePicker.showPicker === 'function') {
      datePicker.showPicker()
      return
    }

    datePicker.focus()
    datePicker.click()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const isoDate = parseBrazilianDate(values.due_date)
    if (!isoDate) {
      setFormError('Informe uma data válida no formato DD/MM/AAAA.')
      return
    }

    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        course: values.course.trim(),
        due_date: isoDate,
        description: values.description.trim() || null,
      })
      if (!deadline) {
        setValues({
          title: '',
          course: '',
          due_date: '',
          priority: 'medium',
          description: '',
          status: 'pending',
        })
      }
    } catch (error) {
      setFormError(error.message)
    }
  }

  return (
    <form className="deadline-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>
          Nome da atividade <span className="required">*</span>
        </span>
        <input
          name="title"
          value={values.title}
          onChange={updateField}
          placeholder="Ex.: Trabalho de sistemas distribuídos"
          maxLength={150}
          required
        />
      </label>

      <div className="form-row">
        <label className="field">
          <span>
            Disciplina <span className="required">*</span>
          </span>
          <input
            name="course"
            value={values.course}
            onChange={updateField}
            placeholder="Ex.: C216"
            maxLength={100}
            required
          />
        </label>
        <label className="field">
          <span>
            Data de entrega <span className="required">*</span>
          </span>
          <div className="date-input-wrap">
            <input
              className="date-text-input"
              name="due_date"
              type="text"
              value={values.due_date}
              onChange={updateField}
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              autoComplete="off"
              maxLength={10}
              pattern="\d{2}/\d{2}/\d{4}"
              aria-describedby="date-format-hint"
              required
            />
            <span id="date-format-hint" className="sr-only">
              Digite a data no formato dia, mês e ano, ou selecione pelo
              calendário.
            </span>
            <button
              className="calendar-button"
              type="button"
              aria-label="Selecionar data pelo calendário"
              title="Selecionar data pelo calendário"
              onClick={openCalendar}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
                <path d="M7.5 3.5v3M16.5 3.5v3M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" />
              </svg>
            </button>
            <input
              ref={datePickerRef}
              className="date-picker-input"
              type="date"
              lang="pt-BR"
              tabIndex="-1"
              aria-hidden="true"
              value={parseBrazilianDate(values.due_date) ?? ''}
              onChange={updateFromCalendar}
            />
          </div>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Prioridade</span>
          <select
            name="priority"
            value={values.priority}
            onChange={updateField}
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </select>
        </label>
        {deadline && (
          <label className="field">
            <span>Status</span>
            <select name="status" value={values.status} onChange={updateField}>
              <option value="pending">Pendente</option>
              <option value="completed">Concluído</option>
            </select>
          </label>
        )}
      </div>

      <label className="field">
        <span>
          Descrição <span className="optional">(opcional)</span>
        </span>
        <textarea
          name="description"
          value={values.description}
          onChange={updateField}
          placeholder="Anotações ou detalhes importantes..."
          rows="3"
          maxLength={2000}
        />
      </label>

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="form-actions">
        {deadline && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="button button-primary"
          disabled={saving}
        >
          {saving
            ? 'Salvando...'
            : deadline
              ? 'Salvar alterações'
              : 'Adicionar prazo'}
        </button>
      </div>
    </form>
  )
}

export default DeadlineForm
