const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/$/, '')
const DEADLINES_URL = `${API_URL}/api/deadlines`

async function request(path = '', options = {}) {
  let response
  try {
    response = await fetch(`${DEADLINES_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(
      'Não foi possível conectar à API. Verifique se o backend está em execução.',
    )
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(' ')
      : detail
    throw new Error(message || `A API retornou um erro (${response.status}).`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const deadlinesApi = {
  list: ({ signal } = {}) => request('?limit=100', { signal }),
  create: (deadline) =>
    request('', { method: 'POST', body: JSON.stringify(deadline) }),
  update: (id, deadline) =>
    request(`/${id}`, { method: 'PUT', body: JSON.stringify(deadline) }),
  updateStatus: (id, status) =>
    request(`/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  remove: (id) => request(`/${id}`, { method: 'DELETE' }),
}
