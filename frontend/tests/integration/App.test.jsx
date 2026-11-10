import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/app/App.jsx";

const gameTitle = "Grand Theft Auto V";
const gameId = "00000000-0000-0000-0000-000000000001";
const comparisons = [
  { field: "console", value: "PS4", result: "correct", direction: null },
  { field: "release_year", value: 2018, result: "correct", direction: null },
  {
    field: "publisher",
    value: "Rockstar Games",
    result: "correct",
    direction: null,
  },
  {
    field: "developer",
    value: "Rockstar Games",
    result: "correct",
    direction: null,
  },
  { field: "total_sales", value: 1, result: "correct", direction: null },
];

let fetchMock;
let currentGame;
let favorites;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createGame(mode = "daily") {
  return {
    id: gameId,
    mode,
    image_url: "https://example.test/cover.jpg",
    blur_percentage: 100,
    attempts: 0,
    max_attempts: 5,
    status: "active",
    answer: null,
    guesses: [],
  };
}

function installApiMock(initialFavorites = []) {
  currentGame = createGame();
  favorites = initialFavorites;
  fetchMock = vi.fn(async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method ?? "GET";

    if (url.pathname === "/api/games/search") {
      return jsonResponse([gameTitle]);
    }
    if (url.pathname === "/api/games" && method === "POST") {
      currentGame = createGame(url.searchParams.get("mode") ?? "daily");
      return jsonResponse(currentGame, 201);
    }
    if (/^\/api\/games\/[^/]+\/guesses$/.test(url.pathname)) {
      const { answer } = JSON.parse(options.body);
      const correct = answer.trim().toLowerCase() === gameTitle.toLowerCase();
      currentGame = {
        ...currentGame,
        attempts: currentGame.attempts + 1,
        blur_percentage: correct
          ? 0
          : Math.max(0, 100 - (currentGame.attempts + 1) * 20),
        status: correct
          ? "won"
          : currentGame.attempts + 1 >= 5
            ? "lost"
            : "active",
        answer: correct || currentGame.attempts + 1 >= 5 ? gameTitle : null,
        guesses: [...currentGame.guesses, { answer, correct }],
      };
      return jsonResponse(currentGame);
    }
    if (url.pathname === "/api/clue-games" && method === "POST") {
      return jsonResponse({ id: gameId, status: "active", guesses: [] }, 201);
    }
    if (url.pathname === "/api/clue-games/search") {
      return jsonResponse([gameTitle]);
    }
    if (/^\/api\/clue-games\/[^/]+\/guesses$/.test(url.pathname)) {
      return jsonResponse({
        title: gameTitle,
        complete: true,
        comparisons,
      });
    }
    if (/^\/api\/clue-games\/[^/]+\/hints$/.test(url.pathname)) {
      return jsonResponse({ field: "console", value: "PS4" });
    }
    if (url.pathname === "/api/favorites" && method === "GET") {
      return jsonResponse(favorites);
    }
    if (/^\/api\/favorites\/[^/]+$/.test(url.pathname) && method === "PUT") {
      const { rounds } = JSON.parse(options.body);
      const favorite = {
        id: url.pathname.split("/").at(-1),
        score: rounds.reduce(
          (total, round) => total + (round.won ? 6 - round.attempts : 0),
          0,
        ),
        total_guesses: rounds.reduce(
          (total, round) => total + round.attempts,
          0,
        ),
        rounds_reached: rounds.length,
        position: favorites.length + 1,
      };
      favorites = [...favorites, favorite];
      return jsonResponse(favorite);
    }
    if (/^\/api\/favorites\/[^/]+$/.test(url.pathname) && method === "PATCH") {
      const id = url.pathname.split("/").at(-1);
      const { position } = JSON.parse(options.body);
      const reordered = [...favorites];
      const from = reordered.findIndex((favorite) => favorite.id === id);
      const [moved] = reordered.splice(from, 1);
      reordered.splice(position - 1, 0, moved);
      favorites = reordered.map((favorite, index) => ({
        ...favorite,
        position: index + 1,
      }));
      return jsonResponse(favorites);
    }
    if (/^\/api\/favorites\/[^/]+$/.test(url.pathname) && method === "DELETE") {
      const id = url.pathname.split("/").at(-1);
      favorites = favorites
        .filter((favorite) => favorite.id !== id)
        .map((favorite, index) => ({ ...favorite, position: index + 1 }));
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected API request: ${method} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(() => {
  installApiMock();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Termo de Jogos API integration", () => {
  it("searches and submits a game guess through the API", async () => {
    const user = userEvent.setup();
    render(<App />);

    const guessInput = await screen.findByLabelText("Seu palpite");
    await user.type(guessInput, "Grand");
    await user.click(await screen.findByRole("button", { name: gameTitle }));
    await user.click(screen.getByRole("button", { name: "Chutar" }));

    expect(await screen.findByText("1 registro")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/games/search?q=Grand"),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/games/${gameId}/guesses`),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("loads clue hints and comparisons from the API", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByLabelText("Seu palpite");
    await user.click(screen.getByRole("button", { name: "Pistas" }));
    await user.click(await screen.findByRole("button", { name: "Ajuda (5)" }));

    expect(await screen.findByText(/Console:/)).toBeInTheDocument();

    const guessInput = screen.getByPlaceholderText("Digite o nome do jogo");
    await user.type(guessInput, "Grand");
    await user.click(await screen.findByRole("button", { name: gameTitle }));
    await user.click(screen.getByRole("button", { name: "Chutar" }));

    expect(await screen.findByText(gameTitle)).toBeInTheDocument();
    for (const field of [
      "Console",
      "Ano",
      "Publicadora",
      "Desenvolvedora",
      "Vendas",
    ]) {
      expect(screen.getByText(field, { exact: true })).toBeInTheDocument();
    }
  });

  it("persists and manages favorite sequences through the API", async () => {
    const first = {
      id: "00000000-0000-0000-0000-000000000010",
      score: 2,
      total_guesses: 4,
      rounds_reached: 1,
      position: 1,
    };
    const second = {
      id: "00000000-0000-0000-0000-000000000011",
      score: 3,
      total_guesses: 3,
      rounds_reached: 1,
      position: 2,
    };
    installApiMock([first, second]);

    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText("Seu palpite");
    await user.click(screen.getByRole("button", { name: /Sequ/ }));

    const moveUpButtons = await screen.findAllByRole("button", {
      name: "Mover favorito para cima",
    });
    await user.click(moveUpButtons[1]);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/favorites/${second.id}`),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: "Remover" })[0]);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/favorites/${second.id}`),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("shows a clear error when the API rejects a guess", async () => {
    const user = userEvent.setup();
    render(<App />);

    const guessInput = await screen.findByLabelText("Seu palpite");
    const apiMock = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, options) => {
      if (String(input).includes("/guesses")) {
        return Promise.resolve(
          jsonResponse({ detail: "Game has already finished" }, 409),
        );
      }
      return apiMock(input, options);
    });
    await user.type(guessInput, "Palpite");
    await user.click(screen.getByRole("button", { name: "Chutar" }));

    expect(
      await screen.findByText("Game has already finished"),
    ).toBeInTheDocument();
  });
});
