import { useState } from "react";
import {
  createGame,
  searchGames,
  submitGameGuess,
} from "../features/game/gameLogic.js";
import ClueMode from "../features/clues/ClueMode.jsx";

function App() {
  const [mode, setMode] = useState("daily");
  const [game, setGame] = useState(() => createGame("daily"));
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [completedRounds, setCompletedRounds] = useState([]);
  const [streakId, setStreakId] = useState(null);
  const [sequenceRound, setSequenceRound] = useState(0);
  const [streakRounds, setStreakRounds] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteSaved, setFavoriteSaved] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);

  const finished = game.status !== "active";

  const startGame = (nextMode, resetProgress = true) => {
    setError(null);
    setGuess("");
    setSuggestions([]);
    setMode(nextMode);
    if (resetProgress && nextMode !== "daily") {
      setScore(0);
      setCompletedRounds([]);
    }
    if (nextMode === "daily") {
      setGame(createGame("daily"));
    } else if (nextMode === "streak") {
      let nextRound = 0;
      if (resetProgress) {
        setSequenceRound(0);
        setStreakId(crypto.randomUUID());
        setStreakRounds([]);
        setFavoriteSaved(false);
      } else {
        nextRound = sequenceRound + 1;
        setSequenceRound(nextRound);
      }
      setGame(createGame("streak", nextRound));
    }
  };

  const submitGuess = (event) => {
    event.preventDefault();
    if (!guess.trim() || game.status !== "active") return;

    setError(null);

    try {
      const updatedGame = submitGameGuess(game, guess);
      setGame(updatedGame);
      setGuess("");
      setSuggestions([]);

      if (updatedGame.status === "won" && updatedGame.mode === "streak") {
        setScore(
          (currentScore) =>
            currentScore + Math.max(0, 6 - updatedGame.attempts),
        );
        setStreakRounds((rounds) => [
          ...rounds,
          { attempts: updatedGame.attempts, won: true },
        ]);
        setCompletedRounds((rounds) => [
          ...rounds,
          {
            id: rounds.length + 1,
            title: updatedGame.answer ?? "Jogo acertado",
            guesses: updatedGame.guesses,
          },
        ]);
        window.setTimeout(() => startGame("streak", false), 900);
      }
      if (updatedGame.status === "lost" && updatedGame.mode === "streak") {
        setStreakRounds((rounds) => [
          ...rounds,
          { attempts: updatedGame.attempts, won: false },
        ]);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro ao enviar palpite.",
      );
    }
  };

  const saveFavorite = () => {
    if (!streakId || !streakRounds.length || favoriteSaved) return;
    const favorite = {
      id: streakId,
      score: streakRounds.reduce(
        (total, round) => total + (round.won ? 6 - round.attempts : 0),
        0,
      ),
      total_guesses: streakRounds.reduce(
        (total, round) => total + round.attempts,
        0,
      ),
      rounds_reached: streakRounds.length,
      position: 1,
    };
    setFavorites((current) =>
      [favorite, ...current].map((item, index) => ({
        ...item,
        position: index + 1,
      })),
    );
    setFavoriteSaved(true);
  };

  const moveFavorite = (favorite, position) => {
    setFavorites((current) => {
      const from = current.findIndex((item) => item.id === favorite.id);
      if (from < 0) return current;
      const to = Math.max(0, Math.min(position - 1, current.length - 1));
      const reordered = [...current];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      return reordered.map((item, index) => ({ ...item, position: index + 1 }));
    });
  };

  const removeFavorite = (favorite) => {
    setFavorites((current) =>
      current
        .filter((item) => item.id !== favorite.id)
        .map((item, index) => ({ ...item, position: index + 1 })),
    );
    if (favorite.id === streakId) setFavoriteSaved(false);
  };

  const resultMessage =
    game.status === "won"
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
              startGame("daily");
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
                onClick={() => startGame("daily")}
                className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${mode === "daily" ? "bg-[#d7f75b] text-[#101314]" : "text-white/45 hover:text-white"}`}
              >
                Diário
              </button>
              <button
                type="button"
                onClick={() => startGame("streak")}
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
                    const value = event.target.value;
                    setGuess(value);
                    setSuggestions(searchGames(value));
                    setError(null);
                  }}
                  disabled={finished}
                  placeholder="Digite o nome do jogo"
                  className="min-w-0 flex-1 bg-transparent py-4 text-lg outline-none placeholder:text-white/25 disabled:cursor-not-allowed"
                />
                <button
                  disabled={!guess.trim() || finished}
                  className="px-2 text-sm font-bold uppercase tracking-wider text-[#d7f75b] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
                  type="submit"
                >
                  Chutar
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
              <span>{game.attempts} tentativas usadas</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span>{`${game.max_attempts - game.attempts} restantes`}</span>
              {mode === "streak" && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/25" />
                  <span className="text-[#d7f75b]">{score} pontos</span>
                </>
              )}
            </div>
            {error && <p className="mt-5 text-sm text-[#ff8f70]">{error}</p>}

            {mode === "streak" && game.status === "lost" && (
              <button
                type="button"
                onClick={saveFavorite}
                disabled={favoriteSaved}
                className="mt-6 border border-[#d7f75b]/50 px-4 py-3 text-sm font-bold text-[#d7f75b] transition-colors hover:bg-[#d7f75b] hover:text-[#101314] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {favoriteSaved
                  ? "Sequência favoritada"
                  : "☆ Adicionar sequência aos favoritos"}
              </button>
            )}

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
                  {game.guesses.map((item) => (
                    <div
                      key={item.id}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#d7f75b]" />{" "}
                {game.blur_percentage}% blur
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
              onClick={() => startGame(mode)}
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
                  key={round.id}
                  className="rounded-full border border-[#d7f75b]/30 px-3 py-2 text-xs text-[#d7f75b]"
                >
                  {index + 1}. {round.title}
                </span>
              ))}
            </div>
          </section>
        )}
        {mode === "streak" && (
          <section className="border-t border-white/10 py-6">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Sequências favoritas
            </h2>
            {favorites.length === 0 ? (
              <p className="text-sm text-white/40">
                Nenhuma sequência favoritada.
              </p>
            ) : (
              <ol className="divide-y divide-white/10">
                {favorites.map((favorite, index) => (
                  <li
                    key={favorite.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <p className="font-display text-lg font-bold text-[#d7f75b]">
                        {favorite.position}. {favorite.score} ponto
                        {favorite.score === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        Rodada {favorite.rounds_reached} ·{" "}
                        {favorite.total_guesses} chute
                        {favorite.total_guesses === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="Mover para cima"
                        aria-label="Mover favorito para cima"
                        disabled={index === 0}
                        onClick={() => moveFavorite(favorite, index)}
                        className="border border-white/15 px-3 py-2 text-sm text-white/65 hover:border-[#d7f75b] hover:text-[#d7f75b] disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Mover para baixo"
                        aria-label="Mover favorito para baixo"
                        disabled={index === favorites.length - 1}
                        onClick={() => moveFavorite(favorite, index + 2)}
                        className="border border-white/15 px-3 py-2 text-sm text-white/65 hover:border-[#d7f75b] hover:text-[#d7f75b] disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFavorite(favorite)}
                        className="border border-white/15 px-3 py-2 text-xs font-bold uppercase text-white/45 hover:border-[#ff8f70] hover:text-[#ff8f70]"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
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
