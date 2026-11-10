import { apiRequest } from "../../services/apiClient.js";

function addGuessIds(game) {
  return {
    ...game,
    guesses: game.guesses.map((guess, index) => ({
      ...guess,
      id: `${game.id}-${index + 1}`,
    })),
  };
}

export function startGame(mode = "daily") {
  return apiRequest(`/api/games?mode=${encodeURIComponent(mode)}`, {
    method: "POST",
  }).then(addGuessIds);
}

export function getGame(gameId) {
  return apiRequest(`/api/games/${encodeURIComponent(gameId)}`).then(
    addGuessIds,
  );
}

export function searchGames(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return Promise.resolve([]);

  return apiRequest(
    `/api/games/search?q=${encodeURIComponent(normalizedQuery)}`,
  );
}

export function submitGameGuess(gameId, answer) {
  return apiRequest(`/api/games/${encodeURIComponent(gameId)}/guesses`, {
    method: "POST",
    body: { answer },
  }).then(addGuessIds);
}
