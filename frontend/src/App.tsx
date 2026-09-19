import { FormEvent, useEffect, useState } from "react";

type GameStatus = "active" | "won" | "lost";
type GameMode = "daily" | "streak";

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
    if (resetProgress) {
      setScore(0);
      setCompletedRounds([]);
    }

    try {
      setGame(
        await api<Game>(`/api/games?mode=${nextMode}`, { method: "POST" }),
      );
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
        if (
          !(requestError instanceof DOMException && requestError.name === "AbortError")
        ) {
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

  const resultMessage = game?.status === "won"
    ? mode === "streak"
      ? "Próximo jogo carregando..."
      : "Você acertou o jogo do dia."
    : "A resposta estava escondida à vista.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#101314] text-[#f4f0e8]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d7f75b] font-display text-lg font-black text-[#101314]">T</span>
            <span className="font-display text-xl font-bold tracking-tight">termo<span className="text-[#d7f75b]">.games</span></span>
          </div>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.28em] text-white/45 sm:block">desafio diário</span>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)] lg:gap-20 lg:py-12">
          <div className="order-2 lg:order-1">
            <div className="mb-8 flex max-w-xl flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
              <button type="button" onClick={() => void startGame("daily")} className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${mode === "daily" ? "bg-[#d7f75b] text-[#101314]" : "text-white/45 hover:text-white"}`}>Diário</button>
              <button type="button" onClick={() => void startGame("streak")} className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${mode === "streak" ? "bg-[#d7f75b] text-[#101314]" : "text-white/45 hover:text-white"}`}>Sequência</button>
            </div>

            <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-[#d7f75b]">{mode === "daily" ? "Jogo do dia" : `Sequência · ${score} ponto${score === 1 ? "" : "s"}`} · {game ? `${Math.min(game.attempts + 1, game.max_attempts)}/${game.max_attempts}` : "..."}</p>
            <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-8xl">Qual é o <span className="text-[#d7f75b]">jogo?</span></h1>
            <p className="mt-7 max-w-md text-base leading-7 text-white/55">{mode === "daily" ? "Uma capa para todo mundo, uma chance de acertar hoje." : "Acerte, marque um ponto e encare a próxima capa. O jogo termina no primeiro erro."}</p>

            <form className="relative mt-8 max-w-xl" onSubmit={submitGuess}>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/45" htmlFor="guess">Seu palpite</label>
              <div className="flex border-b-2 border-white/20 transition-colors focus-within:border-[#d7f75b]">
                <input id="guess" value={guess} onChange={(event) => { setGuess(event.target.value); setError(null); }} disabled={loading || submitting || finished} placeholder="Digite o nome do jogo" className="min-w-0 flex-1 bg-transparent py-4 text-lg outline-none placeholder:text-white/25 disabled:cursor-not-allowed" />
                <button disabled={!guess.trim() || submitting || finished} className="px-2 text-sm font-bold uppercase tracking-wider text-[#d7f75b] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30" type="submit">{submitting ? "..." : "Chutar"}</button>
              </div>
              {suggestions.length > 0 && !finished && <div className="suggestions-list absolute z-10 mt-2 max-h-64 w-full overflow-x-hidden overflow-y-auto rounded-2xl border border-white/10 bg-[#202625] p-2 shadow-2xl shadow-black/40"><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Jogos encontrados</p>{suggestions.map((title) => <button key={title} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setGuess(title); setSuggestions([]); }} className="block w-full rounded-xl px-3 py-3 text-left text-sm text-white/75 transition-colors hover:bg-[#d7f75b] hover:text-[#101314]">{title}</button>)}</div>}
            </form>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-white/45"><span>{game?.attempts ?? 0} tentativas usadas</span><span className="h-1 w-1 rounded-full bg-white/25" /><span>{game ? `${game.max_attempts - game.attempts} restantes` : "carregando"}</span>{mode === "streak" && <><span className="h-1 w-1 rounded-full bg-white/25" /><span className="text-[#d7f75b]">{score} pontos</span></>}</div>
            {error && <p className="mt-5 text-sm text-[#ff8f70]">{error}</p>}

            {game && game.guesses.length > 0 && <div className="mt-8 max-w-xl border-t border-white/10 pt-5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Histórico de chutes</p><span className="text-xs text-white/30">{game.guesses.length} registro{game.guesses.length === 1 ? "" : "s"}</span></div><div className="space-y-2">{game.guesses.map((item, index) => <div key={`${item.answer}-${index}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm"><span className="truncate pr-3 text-white/70">{item.answer}</span><span className={item.correct ? "text-[#d7f75b]" : "text-[#ff8f70]"}>{item.correct ? "acertou" : "errou"}</span></div>)}</div></div>}
          </div>

          <div className="order-1 lg:order-2"><div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#242a29] shadow-2xl shadow-black/30">{game && <img src={game.image_url} alt="Capa do jogo misterioso" className="h-full w-full object-cover transition-[filter] duration-700" style={{ filter: `blur(${game.blur_percentage / 8}px)`, transform: "scale(1.08)" }} />}{loading && <div className="absolute inset-0 grid place-items-center text-sm uppercase tracking-[0.2em] text-white/40">preparando...</div>}{!loading && <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />}<div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-md"><span className="h-2 w-2 rounded-full bg-[#d7f75b]" /> {game?.blur_percentage ?? 100}% blur</div>{finished && game && <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-black/55 p-5 backdrop-blur-md"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7f75b]">{game.status === "won" ? "Acertou" : "Fim de jogo"}</p><p className="mt-2 font-display text-2xl font-bold">{game.answer}</p><p className="mt-1 text-sm text-white/60">{resultMessage}</p>{game.status === "lost" && mode === "streak" && <p className="mt-3 font-display text-lg font-bold text-[#d7f75b]">Pontuação final: {score}</p>}</div>}</div><button type="button" onClick={() => void startGame(mode)} disabled={loading} className="mt-5 w-full rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/65 transition-colors hover:border-[#d7f75b] hover:text-[#d7f75b] disabled:opacity-40">{mode === "daily" ? "Recomeçar diário" : "Nova sequência"}</button></div>
        </section>

        {mode === "streak" && completedRounds.length > 0 && <section className="border-t border-white/10 py-6"><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Jogos acertados nesta sequência</p><div className="flex flex-wrap gap-2">{completedRounds.map((round, index) => <span key={`${round.title}-${index}`} className="rounded-full border border-[#d7f75b]/30 px-3 py-2 text-xs text-[#d7f75b]">{index + 1}. {round.title}</span>)}</div></section>}
        <footer className="flex justify-between border-t border-white/10 pt-5 text-xs uppercase tracking-[0.18em] text-white/30"><span>Termo de Jogos</span><span>{mode === "daily" ? "diário" : `${score} pontos`}</span></footer>
      </div>
    </main>
  );
}

export default App;
