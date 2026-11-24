import { expect, test as base } from '@playwright/test'

const API_URL = 'http://localhost:8001'

function dateOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function toBrazilianDate(isoDate) {
  return isoDate.split('-').reverse().join('/')
}

const test = base.extend({
  createDeadline: async ({ request }, use) => {
    const createdIds = []
    await use(async (overrides = {}) => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const payload = {
        title: `E2E fixture ${suffix}`,
        description: null,
        course: 'E2E',
        due_date: dateOffset(14),
        priority: 'medium',
        status: 'pending',
        ...overrides,
      }
      const response = await request.post(`${API_URL}/api/deadlines`, {
        data: payload,
      })
      expect(response.status()).toBe(201)
      const deadline = await response.json()
      createdIds.push(deadline.id)
      return deadline
    })

    for (const id of createdIds) {
      const response = await request.delete(`${API_URL}/api/deadlines/${id}`)
      expect([204, 404]).toContain(response.status())
    }
  },
})

test('creates, edits, completes, persists, reopens, and deletes a deadline', async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const title = `E2E entrega ${suffix}`
  const editedTitle = `E2E entrega revisada ${suffix}`
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)
  const brazilianDate = [
    String(dueDate.getDate()).padStart(2, '0'),
    String(dueDate.getMonth() + 1).padStart(2, '0'),
    dueDate.getFullYear(),
  ].join('/')
  let deadlineId

  try {
    await page.goto('/')
    await page.getByLabel(/Nome da atividade/).fill(title)
    await page.getByLabel(/Disciplina/).fill('E2E')
    await page.getByLabel(/Data de entrega/).fill(brazilianDate)

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === `${API_URL}/api/deadlines` &&
        response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Adicionar prazo' }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.status()).toBe(201)
    deadlineId = (await createResponse.json()).id

    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    await page.getByRole('button', { name: `Editar ${title}` }).click()
    await page.getByLabel(/Nome da atividade/).fill(editedTitle)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('heading', { name: editedTitle })).toBeVisible()

    await page
      .getByRole('button', {
        name: `Marcar ${editedTitle} como concluído`,
      })
      .click()
    const deadlineCard = page
      .locator('.deadline-item')
      .filter({ has: page.getByRole('heading', { name: editedTitle }) })
    await expect(deadlineCard.getByText('Concluído')).toBeVisible()

    await page.getByRole('button', { name: `Reabrir ${editedTitle}` }).click()
    await expect(deadlineCard.getByText('Pendente')).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `Excluir ${editedTitle}` }).click()
    await expect(page.getByRole('heading', { name: editedTitle })).toHaveCount(
      0,
    )
    deadlineId = undefined
  } finally {
    if (deadlineId !== undefined) {
      const cleanupResponse = await request.delete(
        `${API_URL}/api/deadlines/${deadlineId}`,
      )
      expect([204, 404]).toContain(cleanupResponse.status())
    }
  }
})

test('searches by activity and clears a no-results filter', async ({
  page,
  createDeadline,
}) => {
  const deadline = await createDeadline()
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: deadline.title }),
  ).toBeVisible()

  await page.getByRole('searchbox').fill('no matching deadline')
  await expect(page.getByText('Nenhum prazo encontrado')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()

  await expect(
    page.getByRole('heading', { name: deadline.title }),
  ).toBeVisible()
  await expect(page.getByRole('searchbox')).toHaveValue('')
})

test('filters pending deadlines and excludes completed ones', async ({
  page,
  createDeadline,
}) => {
  const pending = await createDeadline({ title: `Pendente ${Date.now()}` })
  const completed = await createDeadline({
    title: `Concluído ${Date.now()}`,
    status: 'completed',
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: pending.title })).toBeVisible()
  await page.getByRole('button', { name: 'Pendentes' }).click()

  await expect(page.getByRole('heading', { name: pending.title })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: completed.title }),
  ).toHaveCount(0)
})

test('filters overdue deadlines and excludes pending ones', async ({
  page,
  createDeadline,
}) => {
  const overdue = await createDeadline({
    title: `Atrasado ${Date.now()}`,
    due_date: dateOffset(-2),
  })
  const pending = await createDeadline({ title: `No prazo ${Date.now()}` })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: overdue.title })).toBeVisible()
  await page.getByRole('button', { name: 'Atrasados' }).click()

  await expect(page.getByRole('heading', { name: overdue.title })).toBeVisible()
  await expect(page.getByRole('heading', { name: pending.title })).toHaveCount(
    0,
  )
})

test('persists a completed status after reloading the page', async ({
  page,
  createDeadline,
}) => {
  const deadline = await createDeadline({ title: `Concluir ${Date.now()}` })
  await page.goto('/')
  await page
    .getByRole('button', {
      name: `Marcar ${deadline.title} como concluído`,
    })
    .click()

  const card = page
    .locator('.deadline-item')
    .filter({ has: page.getByRole('heading', { name: deadline.title }) })
  await expect(card.getByText('Concluído')).toBeVisible()
  await page.reload()
  await expect(card.getByText('Concluído')).toBeVisible()
  await expect(
    page.getByRole('button', { name: `Reabrir ${deadline.title}` }),
  ).toBeVisible()
})

test('reopens a completed deadline and persists the pending status', async ({
  page,
  createDeadline,
}) => {
  const deadline = await createDeadline({
    title: `Reabrir ${Date.now()}`,
    status: 'completed',
  })
  await page.goto('/')
  await page.getByRole('button', { name: `Reabrir ${deadline.title}` }).click()

  const card = page
    .locator('.deadline-item')
    .filter({ has: page.getByRole('heading', { name: deadline.title }) })
  await expect(card.getByText('Pendente')).toBeVisible()
  await page.reload()
  await expect(card.getByText('Pendente')).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: `Marcar ${deadline.title} como concluído`,
    }),
  ).toBeVisible()
})

test('keeps a deadline when the delete confirmation is dismissed', async ({
  page,
  request,
  createDeadline,
}) => {
  const deadline = await createDeadline({
    title: `Manter ${Date.now()}`,
  })
  await page.goto('/')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: `Excluir ${deadline.title}` }).click()

  await expect(
    page.getByRole('heading', { name: deadline.title }),
  ).toBeVisible()
  const response = await request.get(`${API_URL}/api/deadlines/${deadline.id}`)
  expect(response.status()).toBe(200)
  expect((await response.json()).title).toBe(deadline.title)
})

test('updates deadline details in the UI and database', async ({
  page,
  request,
  createDeadline,
}) => {
  const deadline = await createDeadline({
    title: `Editar ${Date.now()}`,
    description: 'Descrição inicial',
  })
  const updated = {
    title: `Editado ${Date.now()}`,
    course: 'C216 atualizado',
    due_date: dateOffset(30),
    priority: 'high',
    description: 'Descrição atualizada',
  }
  await page.goto('/')
  await page.getByRole('button', { name: `Editar ${deadline.title}` }).click()
  await page.getByLabel(/Nome da atividade/).fill(updated.title)
  await page.getByLabel(/Disciplina/).fill(updated.course)
  await page
    .getByLabel(/Data de entrega/)
    .fill(toBrazilianDate(updated.due_date))
  await page.getByLabel('Prioridade').selectOption(updated.priority)
  await page
    .getByPlaceholder('Anotações ou detalhes importantes...')
    .fill(updated.description)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()

  const card = page
    .locator('.deadline-item')
    .filter({ has: page.getByRole('heading', { name: updated.title }) })
  await expect(card.getByText(updated.course)).toBeVisible()
  await expect(card.getByText(updated.description)).toBeVisible()
  await expect(card.getByText('Prioridade Alta')).toBeVisible()

  const response = await request.get(`${API_URL}/api/deadlines/${deadline.id}`)
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject(updated)
})

test('rejects an impossible Brazilian date without sending a create request', async ({
  page,
}) => {
  const createRequests = []
  page.on('request', (request) => {
    if (
      request.url() === `${API_URL}/api/deadlines` &&
      request.method() === 'POST'
    ) {
      createRequests.push(request)
    }
  })
  await page.goto('/')
  await page.getByLabel(/Nome da atividade/).fill(`Data inválida ${Date.now()}`)
  await page.getByLabel(/Disciplina/).fill('E2E')
  await page.getByLabel(/Data de entrega/).fill('31/02/2027')
  await page.getByRole('button', { name: 'Adicionar prazo' }).click()

  await expect(page.getByRole('alert')).toHaveText(
    'Informe uma data válida no formato DD/MM/AAAA.',
  )
  expect(createRequests).toHaveLength(0)
})

test('shows an API connection error and recovers after retry', async ({
  page,
}) => {
  let attempts = 0
  await page.route(/\/api\/deadlines\?limit=100$/, async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.abort()
      return
    }
    await route.continue()
  })
  await page.goto('/')

  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível conectar à API.',
  )
  const retryResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${API_URL}/api/deadlines?limit=100` &&
      response.request().method() === 'GET',
  )
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  const retryResponse = await retryResponsePromise
  expect(retryResponse.status()).toBe(200)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(attempts).toBe(2)
})
