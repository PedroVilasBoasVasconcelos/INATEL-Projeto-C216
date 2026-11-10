function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header>
          <p className="text-sm font-semibold tracking-wide text-indigo-600">
            C216 · Projeto Final
          </p>
          <h1
            id="page-title"
            className="mt-3 text-4xl font-bold tracking-tight"
          >
            Agenda Acadêmica
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Organize seus compromissos e acompanhe os prazos das atividades da
            faculdade.
          </p>
        </header>

        <section
          aria-labelledby="deadlines-title"
          className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 id="deadlines-title" className="text-xl font-semibold">
            Prazos acadêmicos
          </h2>
          <p className="mt-2 text-slate-600">
            Sua lista de prazos será exibida aqui.
          </p>
        </section>
      </div>
    </main>
  )
}

export default App
