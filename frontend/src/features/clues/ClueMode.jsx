import { useState } from "react";
import {
  createClueSession,
  revealNextHint,
  searchClueGames,
  submitClueGuess,
} from "../game/gameLogic.js";

export default function ClueMode({ onExit }) {
  const [session, setSession] = useState(() => createClueSession());
  const [round, setRound] = useState(1);
  const [guess, setGuess] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);

  const start = () => {
    setError(null);
    setGuess("");
    setSuggestions([]);
    setSession(createClueSession(round));
    setRound((current) => current + 1);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!guess.trim()) return;
    try {
      setSession(submitClueGuess(session, guess));
      setGuess("");
      setSuggestions([]);
      setError(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível validar o palpite.",
      );
    }
  };

  const requestHint = () => {
    try {
      const result = revealNextHint(session);
      setSession(result.session);
      setError(null);
    } catch (hintError) {
      setError(
        hintError instanceof Error
          ? hintError.message
          : "Não foi possível obter a ajuda.",
      );
    }
  };

  const hints = session.hints;
  const history = session.guesses;
  const label = {
    console: "Console",
    release_year: "Ano",
    publisher: "Publicadora",
    developer: "Desenvolvedora",
    total_sales: "Vendas",
  };
  const formatValue = (field, value) =>
    field === "total_sales"
      ? `${Number(value).toLocaleString("pt-BR")} unidades`
      : value;

  return (
    <section className="flex-1 py-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={onExit}
          className="mb-8 text-xs font-bold uppercase tracking-[0.2em] text-white/45 hover:text-[#d7f75b]"
        >
          ← Voltar aos modos de capa
        </button>
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-[#d7f75b]">
          Modo pistas · CSV
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-7xl">
          Qual jogo combina com{" "}
          <span className="text-[#d7f75b]">estas pistas?</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-white/55">
          Escolha um jogo e compare console, ano, publicadora, desenvolvedora e
          vendas com o jogo secreto.
        </p>
        <form className="relative mt-10 max-w-2xl" onSubmit={submit}>
          <div className="flex border-b-2 border-white/20 focus-within:border-[#d7f75b]">
            <input
              value={guess}
              onChange={(event) => {
                const value = event.target.value;
                setGuess(value);
                setSuggestions(searchClueGames(value));
              }}
              disabled={history.some((item) => item.complete)}
              placeholder="Digite o nome do jogo"
              className="min-w-0 flex-1 bg-transparent py-4 text-lg outline-none placeholder:text-white/25"
            />
            <button
              type="submit"
              disabled={!guess.trim() || history.some((item) => item.complete)}
              className="px-2 text-sm font-bold uppercase tracking-wider text-[#d7f75b] disabled:opacity-30"
            >
              Chutar
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="suggestions-list absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#202625] p-2 shadow-2xl">
              {suggestions.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    setGuess(title);
                    setSuggestions([]);
                  }}
                  className="block w-full rounded-xl px-3 py-3 text-left text-sm text-white/75 hover:bg-[#d7f75b] hover:text-[#101314]"
                >
                  {title}
                </button>
              ))}
            </div>
          )}
        </form>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={requestHint}
            disabled={
              hints.length >= 5 || history.some((item) => item.complete)
            }
            className="rounded-full border border-[#d7f75b]/50 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#d7f75b] hover:bg-[#d7f75b] hover:text-[#101314] disabled:opacity-35"
          >
            Ajuda ({5 - hints.length})
          </button>
          {hints.map((hint) => (
            <span
              key={hint.field}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65"
            >
              {label[hint.field]}:{" "}
              <strong className="text-[#d7f75b]">
                {formatValue(hint.field, hint.value)}
              </strong>
            </span>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-[#ff8f70]">{error}</p>}
        <div className="mt-12 space-y-6">
          {history.map((clueRound, index) => (
            <article
              key={clueRound.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <span className="font-display text-xl font-bold">
                  {clueRound.title}
                </span>
                <span
                  className={
                    clueRound.complete ? "text-[#d7f75b]" : "text-white/40"
                  }
                >
                  {clueRound.complete
                    ? "Jogo encontrado"
                    : `Tentativa ${history.length - index}`}
                </span>
              </div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-5">
                {clueRound.comparisons.map((item) => (
                  <div
                    key={item.field}
                    className={`p-4 ${item.result === "correct" ? "bg-[#d7f75b]/15" : item.result === "close" ? "bg-[#f0a34a]/15" : "bg-[#ff756b]/10"}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                      {label[item.field]}
                    </p>
                    <p className="mt-3 font-display text-lg font-bold">
                      {formatValue(item.field, item.value)}
                    </p>
                    <p
                      className={`mt-2 text-xs font-bold uppercase ${item.result === "correct" ? "text-[#d7f75b]" : item.result === "close" ? "text-[#f0a34a]" : "text-[#ff756b]"}`}
                    >
                      {item.result === "correct"
                        ? "certo"
                        : item.result === "close"
                          ? "perto"
                          : item.direction
                            ? `errado ${item.direction === "up" ? "↑" : "↓"}`
                            : "errado"}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <button
          type="button"
          onClick={start}
          className="mt-8 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/65 hover:border-[#d7f75b] hover:text-[#d7f75b]"
        >
          Novo jogo de pistas
        </button>
      </div>
    </section>
  );
}
