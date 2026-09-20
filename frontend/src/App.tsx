import { FormEvent, useEffect, useState } from "react";

type GameStatus = "active" | "won" | "lost";
type GameMode = "daily" | "streak" | "clues";

type Guess = {
  answer: string;
  correct: boolean;
};

type Game = {
  id: string;
  mode: GameMode;
  image_url: string;
  blur_percentage: number;
  attempts: number;
  max_attempts: number;
  status: GameStatus;
  correct: boolean | null;
  answer: string | null;
  guesses: Guess[];
};

type CompletedRound = {
  title: string;
  guesses: Guess[];
};

type DailySave = {
  date: string;
  guesses: string[];
};

type ClueComparison = {
  field: string;
  value: string | number;
  result: "correct" | "close" | "wrong";
  direction: "up" | "down" | null;
};

type ClueGuess = {
  title: string;
  complete: boolean;
  comparisons: ClueComparison[];
};

type Hint = {
  field: string;
  value: string | number;
};

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Não foi possível conectar à API.");
  }

  return response.json() as Promise<T>;
};

const dailyStorageKey = "termo-games-daily";

const getTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const getDailySave = (): DailySave => {
  try {
    const saved = JSON.parse(localStorage.getItem(dailyStorageKey) ?? "null") as DailySave | null;
    return saved?.date === getTodayKey() ? saved : { date: getTodayKey(), guesses: [] };
  } catch {
    return { date: getTodayKey(), guesses: [] };
  }
};

const saveDailyGuess = (answer: string) => {
  const saved = getDailySave();
  localStorage.setItem(dailyStorageKey, JSON.stringify({ ...saved, guesses: [...saved.guesses, answer] }));
};

function ClueMode({ onExit }: { onExit: () => void }) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);
  const [history, setHistory] = useState<ClueGuess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    setGuess("");
    setSuggestions([]);
    setHistory([]);
    setHints([]);
    try {
      const game = await api<{ id: string }>("/api/clue-games", {
        method: "POST",
      });
      setGameId(game.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro ao iniciar o modo pistas.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void start();
  }, []);

  useEffect(() => {
    if (guess.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    void api<string[]>(
      `/api/clue-games/search?q=${encodeURIComponent(guess.trim())}`,
      { signal: controller.signal },
    )
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
    return () => controller.abort();
  }, [guess]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gameId || !guess.trim()) return;
    try {
      const result = await api<ClueGuess>(`/api/clue-games/${gameId}/guesses`, {
        method: "POST",
        body: JSON.stringify({ answer: guess }),
      });
      setHistory((current) => [result, ...current]);
      setGuess("");
      setSuggestions([]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Jogo não encontrado.",
      );
    }
  };

  const requestHint = async () => {
    if (!gameId) return;
    try {
      const hint = await api<Hint>(`/api/clue-games/${gameId}/hints`, {
        method: "POST",
      });
      setHints((current) => [...current, hint]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível obter a ajuda.",
      );
    }
  };

  const label: Record<string, string> = {
    console: "Console",
    release_year: "Ano",
    publisher: "Publicadora",
    developer: "Desenvolvedora",
    total_sales: "Vendas",
  };
  const formatValue = (field: string, value: string | number) =>
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
              onChange={(event) => setGuess(event.target.value)}
              disabled={loading || !gameId}
              placeholder="Digite o nome do jogo"
              className="min-w-0 flex-1 bg-transparent py-4 text-lg outline-none placeholder:text-white/25"
            />
            <button
              type="submit"
              disabled={!guess.trim() || loading}
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
            onClick={() => void requestHint()}
            disabled={loading || hints.length >= 5}
            className="rounded-full border border-[#d7f75b]/50 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#d7f75b] hover:bg-[#d7f75b] hover:text-[#101314] disabled:opacity-35"
          >
            Ajuda ({5 - hints.length})
          </button>
          {hints.map((hint) => (
            <span
              key={hint.field}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65"
            >
              {label[hint.field]}: <strong className="text-[#d7f75b]">{formatValue(hint.field, hint.value)}</strong>
            </span>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-[#ff8f70]">{error}</p>}
        <div className="mt-12 space-y-6">
          {history.map((round, index) => (
            <article
              key={`${round.title}-${index}`}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <span className="font-display text-xl font-bold">
                  {round.title}
                </span>
                <span
                  className={
                    round.complete ? "text-[#d7f75b]" : "text-white/40"
                  }
                >
                  {round.complete
                    ? "Jogo encontrado"
                    : `Tentativa ${history.length - index}`}
                </span>
              </div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-5">
                {round.comparisons.map((item) => (
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
          onClick={() => void start()}
          disabled={loading}
          className="mt-8 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/65 hover:border-[#d7f75b] hover:text-[#d7f75b]"
        >
          Novo jogo de pistas
        </button>
      </div>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState<GameMode>("daily");
  const [game, setGame] = useState<Game | null>(null);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finished = game?.status !== "active";

  const startGame = async (nextMode: GameMode, resetProgress = true) => {
    setLoading(true);
    setError(null);
    setGuess("");
    setSuggestions([]);
    setMode(nextMode);
    if (resetProgress && nextMode !== "daily") {
      setScore(0);
      setCompletedRounds([]);
    }

    try {
      let restoredGame = await api<Game>(`/api/games?mode=${nextMode}`, { method: "POST" });
      if (nextMode === "daily") {
        const saved = getDailySave();
        for (const savedGuess of saved.guesses) {
          if (restoredGame.status !== "active") break;
          restoredGame = await api<Game>(`/api/games/${restoredGame.id}/guesses`, {
            method: "POST",
            body: JSON.stringify({ answer: savedGuess }),
          });
        }
      }
      setGame(restoredGame);
    } catch (requestError) {
      if (
        requestError instanceof Error &&
        requestError.message === "Game not found"
      ) {
        await startGame(mode, false);
        setError("A partida foi reiniciada. Tente o palpite novamente.");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro ao iniciar a partida.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void startGame("daily");
  }, []);

  useEffect(() => {
    const query = guess.trim();
    if (query.length < 2 || finished) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const loadSuggestions = async () => {
      try {
        const results = await api<string[]>(
          `/api/games/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        setSuggestions(results);
      } catch (requestError) {
        if (!(
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )) {
          setSuggestions([]);
        }
      }
    };

    void loadSuggestions();
    return () => controller.abort();
  }, [guess, game?.status]);

  const submitGuess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!game || !guess.trim() || game.status !== "active") return;

    setSubmitting(true);
    setError(null);

    try {
      const updatedGame = await api<Game>(`/api/games/${game.id}/guesses`, {
        method: "POST",
        body: JSON.stringify({ answer: guess }),
      });
      setGame(updatedGame);
      setGuess("");
      setSuggestions([]);
      if (updatedGame.mode === "daily") saveDailyGuess(guess);

      if (updatedGame.status === "won" && updatedGame.mode === "streak") {
        setScore((currentScore) => currentScore + 1);
        setCompletedRounds((rounds) => [
          ...rounds,
          {
            title: updatedGame.answer ?? "Jogo acertado",
            guesses: updatedGame.guesses,
          },
        ]);
        window.setTimeout(() => void startGame("streak", false), 900);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro ao enviar palpite.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resultMessage =
    game?.status === "won"
      ? mode === "streak"
        ? "Próximo jogo carregando..."
        : "Você acertou o jogo do dia."
      : "A resposta estava escondida à vista.";

  if (mode === "clues") {
    return (
      <main className="min-h-screen overflow-hidden bg-[#101314] px-5 py-6 text-[#f4f0e8] sm:px-8 lg:px-12">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
          <header className="flex items-center justify-between border-b border-white/10 pb-5">
            <span className="font-display text-xl font-bold tracking-tight">
              termo<span className="text-[#d7f75b]">.games</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
              modo pistas
            </span>
          </header>
          <ClueMode
            onExit={() => {
              setMode("daily");
              void startGame("daily");
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#101314] text-[#f4f0e8]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d7f75b] font-display text-lg font-black text-[#101314]">
              T
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              termo<span className="text-[#d7f75b]">.games</span>
            </span>
          </div>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.28em] text-white/45 sm:block">
            desafio diário
          </span>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)] lg:gap-20 lg:py-12">
          <div className="order-2 lg:order-1">
            <div className="mb-8 flex max-w-xl flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => void startGame("daily")}
                className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${mode === "daily" ? "bg-[#d7f75b] text-[#101314]" : "text-white/45 hover:text-white"}`}
              >
                Diário
              </button>
              <button
                type="button"
                onClick={() => void startGame("streak")}
                className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${mode === "streak" ? "bg-[#d7f75b] text-[#101314]" : "text-white/45 hover:text-white"}`}
              >
                Sequência
              </button>
              <button
                type="button"
                onClick={() => setMode("clues")}
                className="flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white/45 transition-colors hover:text-white"
              >
                Pistas
              </button>
            </div>

            <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-[#d7f75b]">
              {mode === "daily"
                ? "Jogo do dia"
                : `Sequência · ${score} ponto${score === 1 ? "" : "s"}`}{" "}
              ·{" "}
              {game
                ? `${Math.min(game.attempts + 1, game.max_attempts)}/${game.max_attempts}`
                : "..."}
            </p>
            <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
              Qual é o <span className="text-[#d7f75b]">jogo?</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-white/55">
              {mode === "daily"
                ? "Uma capa para todo mundo, uma chance de acertar hoje."
                : "Acerte, marque um ponto e encare a próxima capa. Você tem cinco tentativas por jogo."}
            </p>

            <form className="relative mt-8 max-w-xl" onSubmit={submitGuess}>
              <label
                className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/45"
                htmlFor="guess"
              >
                Seu palpite
              </label>
              <div className="flex border-b-2 border-white/20 transition-colors focus-within:border-[#d7f75b]">
                <input
                  id="guess"
                  value={guess}
                  onChange={(event) => {
                    setGuess(event.target.value);
                    setError(null);
                  }}
                  disabled={loading || submitting || finished}
                  placeholder="Digite o nome do jogo"
                  className="min-w-0 flex-1 bg-transparent py-4 text-lg outline-none placeholder:text-white/25 disabled:cursor-not-allowed"
                />
                <button
                  disabled={!guess.trim() || submitting || finished}
                  className="px-2 text-sm font-bold uppercase tracking-wider text-[#d7f75b] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
                  type="submit"
                >
                  {submitting ? "..." : "Chutar"}
                </button>
              </div>
              {suggestions.length > 0 && !finished && (
                <div className="suggestions-list absolute z-10 mt-2 max-h-64 w-full overflow-x-hidden overflow-y-auto rounded-2xl border border-white/10 bg-[#202625] p-2 shadow-2xl shadow-black/40">
                  <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                    Jogos encontrados
                  </p>
                  {suggestions.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setGuess(title);
                        setSuggestions([]);
                      }}
                      className="block w-full rounded-xl px-3 py-3 text-left text-sm text-white/75 transition-colors hover:bg-[#d7f75b] hover:text-[#101314]"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-white/45">
              <span>{game?.attempts ?? 0} tentativas usadas</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span>
                {game
                  ? `${game.max_attempts - game.attempts} restantes`
                  : "carregando"}
              </span>
              {mode === "streak" && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/25" />
                  <span className="text-[#d7f75b]">{score} pontos</span>
                </>
              )}
            </div>
            {error && <p className="mt-5 text-sm text-[#ff8f70]">{error}</p>}

            {game && game.guesses.length > 0 && (
              <div className="mt-8 max-w-xl border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
                    Histórico de chutes
                  </p>
                  <span className="text-xs text-white/30">
                    {game.guesses.length} registro
                    {game.guesses.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-2">
                  {game.guesses.map((item, index) => (
                    <div
                      key={`${item.answer}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm"
                    >
                      <span className="truncate pr-3 text-white/70">
                        {item.answer}
                      </span>
                      <span
                        className={
                          item.correct ? "text-[#d7f75b]" : "text-[#ff8f70]"
                        }
                      >
                        {item.correct ? "acertou" : "errou"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#242a29] shadow-2xl shadow-black/30">
              {game && (
                <img
                  src={game.image_url}
                  alt="Capa do jogo misterioso"
                  className="h-full w-full object-cover transition-[filter] duration-700"
                  style={{
                    filter: `blur(${game.blur_percentage / 8}px)`,
                    transform: "scale(1.08)",
                  }}
                />
              )}
              {loading && (
                <div className="absolute inset-0 grid place-items-center text-sm uppercase tracking-[0.2em] text-white/40">
                  preparando...
                </div>
              )}
              {!loading && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
              )}
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#d7f75b]" />{" "}
                {game?.blur_percentage ?? 100}% blur
              </div>
              {finished && game && (
                <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-black/55 p-5 backdrop-blur-md">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7f75b]">
                    {game.status === "won" ? "Acertou" : "Fim de jogo"}
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {game.answer}
                  </p>
                  <p className="mt-1 text-sm text-white/60">{resultMessage}</p>
                  {game.status === "lost" && mode === "streak" && (
                    <p className="mt-3 font-display text-lg font-bold text-[#d7f75b]">
                      Pontuação final: {score}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void startGame(mode)}
              disabled={loading}
              className="mt-5 w-full rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/65 transition-colors hover:border-[#d7f75b] hover:text-[#d7f75b] disabled:opacity-40"
            >
              {mode === "daily" ? "Recomeçar diário" : "Nova sequência"}
            </button>
          </div>
        </section>

        {mode === "streak" && completedRounds.length > 0 && (
          <section className="border-t border-white/10 py-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Jogos acertados nesta sequência
            </p>
            <div className="flex flex-wrap gap-2">
              {completedRounds.map((round, index) => (
                <span
                  key={`${round.title}-${index}`}
                  className="rounded-full border border-[#d7f75b]/30 px-3 py-2 text-xs text-[#d7f75b]"
                >
                  {index + 1}. {round.title}
                </span>
              ))}
            </div>
          </section>
        )}
        <footer className="flex justify-between border-t border-white/10 pt-5 text-xs uppercase tracking-[0.18em] text-white/30">
          <span>Termo de Jogos</span>
          <span>{mode === "daily" ? "diário" : `${score} pontos`}</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
