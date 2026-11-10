import { apiRequest } from "../../services/apiClient.js";

export function getFavorites() {
  return apiRequest("/api/favorites");
}

export function saveFavorite(sequenceId, rounds) {
  return apiRequest(`/api/favorites/${encodeURIComponent(sequenceId)}`, {
    method: "PUT",
    body: { rounds },
  });
}

export function moveFavorite(sequenceId, position) {
  return apiRequest(`/api/favorites/${encodeURIComponent(sequenceId)}`, {
    method: "PATCH",
    body: { position },
  });
}

export function removeFavorite(sequenceId) {
  return apiRequest(`/api/favorites/${encodeURIComponent(sequenceId)}`, {
    method: "DELETE",
  });
}
