import { afterEach, describe, expect, it, vi } from "vitest";
import { getGame } from "../../src/features/game/gameService.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gameService", () => {
  it("loads a persisted game and assigns stable IDs to its guesses", async () => {
    const gameId = "00000000-0000-0000-0000-000000000001";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: gameId,
          mode: "daily",
          guesses: [{ answer: "Wrong answer", correct: false }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getGame(gameId)).resolves.toMatchObject({
      id: gameId,
      guesses: [
        {
          id: `${gameId}-1`,
          answer: "Wrong answer",
          correct: false,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:8000/api/games/${gameId}`,
      expect.objectContaining({ method: "GET" }),
    );
  });
});
