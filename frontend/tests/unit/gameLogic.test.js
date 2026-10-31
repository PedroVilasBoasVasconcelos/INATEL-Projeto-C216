import { describe, expect, it } from "vitest";
import {
  createClueSession,
  createGame,
  revealNextHint,
  searchGames,
  submitClueGuess,
  submitGameGuess,
} from "../../src/features/game/gameLogic.js";

describe("cover game logic", () => {
  it("uses the same daily answer for the same date and allows a restart", () => {
    const date = new Date("2026-10-31T12:00:00Z");
    const first = createGame("daily", 0, date);
    const restarted = createGame("daily", 0, date);

    expect(first.targetTitle).toBe(restarted.targetTitle);
    expect(restarted.attempts).toBe(0);
    expect(restarted.guesses).toEqual([]);
  });

  it("tracks wrong guesses, reveals the cover, and ends after five attempts", () => {
    let game = createGame("daily", 0, new Date("2026-10-31T12:00:00Z"));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      game = submitGameGuess(game, "Not this game");
    }

    expect(game.status).toBe("lost");
    expect(game.answer).toBe(game.targetTitle);
    expect(game.guesses).toHaveLength(5);
    expect(game.blur_percentage).toBe(0);
    expect(() => submitGameGuess(game, "Another guess")).toThrow(
      "Esta partida já foi encerrada.",
    );
  });

  it("accepts case and whitespace variants of the correct answer", () => {
    const game = createGame("streak", 0);
    const result = submitGameGuess(
      game,
      `  ${game.targetTitle.toUpperCase()}  `,
    );

    expect(result.status).toBe("won");
    expect(result.guesses[0]).toEqual({
      id: 1,
      answer: game.targetTitle.toUpperCase(),
      correct: true,
    });
  });

  it("searches local titles without calling an API", () => {
    expect(searchGames("  grand ")).toContain("Grand Theft Auto V");
    expect(searchGames("x")).toEqual([]);
  });
});

describe("clue mode logic", () => {
  it("reveals up to five clues and completes when the secret title is guessed", () => {
    const session = createClueSession(0, new Date("2026-10-31T12:00:00Z"));
    const { session: hinted, hint } = revealNextHint(session);
    const completed = submitClueGuess(hinted, session.target.title);

    expect(hint.field).toBe("console");
    expect(completed.guesses[0].complete).toBe(true);
    expect(
      completed.guesses[0].comparisons.every(
        (item) => item.result === "correct",
      ),
    ).toBe(true);
    expect(() => revealNextHint(completed)).toThrow(
      "Este jogo de pistas já foi concluído.",
    );
  });
});
