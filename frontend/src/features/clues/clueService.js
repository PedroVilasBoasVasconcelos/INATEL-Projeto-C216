import { apiRequest } from "../../services/apiClient.js";

export function startClueGame() {
  return apiRequest("/api/clue-games", { method: "POST" });
}

export function searchClueGames(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return Promise.resolve([]);

  return apiRequest(
    `/api/clue-games/search?q=${encodeURIComponent(normalizedQuery)}`,
  );
}

export function submitClueGuess(gameId, title) {
  return apiRequest(`/api/clue-games/${encodeURIComponent(gameId)}/guesses`, {
    method: "POST",
    body: { answer: title },
  });
}

export function requestClueHint(gameId) {
  return apiRequest(`/api/clue-games/${encodeURIComponent(gameId)}/hints`, {
    method: "POST",
  });
}
