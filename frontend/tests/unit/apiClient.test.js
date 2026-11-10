import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../src/services/apiClient.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("sends JSON requests and returns the decoded response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "game-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/games", {
        method: "POST",
        body: { mode: "daily" },
      }),
    ).resolves.toEqual({ id: "game-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/games",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "daily" }),
      }),
    );
  });

  it("surfaces API errors and connection failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: "Game not found" }), {
            status: 404,
          }),
        )
        .mockRejectedValueOnce(new TypeError("Network unavailable")),
    );

    await expect(apiRequest("/api/games/missing")).rejects.toThrow(
      "Game not found",
    );
    await expect(apiRequest("/api/games")).rejects.toThrow(
      "Não foi possível conectar à API.",
    );
  });
});
