import { expect, test } from "@playwright/test";

async function mockApi(page) {
  let gameId = 0;
  let currentGame;
  let clueId = 0;
  let favorites = [];

  const json = (route, payload, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === "/api/games/search") {
      return json(route, ["Grand Theft Auto V"]);
    }

    if (url.pathname === "/api/games" && method === "POST") {
      gameId += 1;
      currentGame = {
        id: `00000000-0000-0000-0000-${String(gameId).padStart(12, "0")}`,
        mode: url.searchParams.get("mode") ?? "daily",
        image_url: "https://example.test/cover.jpg",
        blur_percentage: 100,
        attempts: 0,
        max_attempts: 5,
        status: "active",
        answer: null,
        guesses: [],
      };
      return json(route, currentGame, 201);
    }

    if (/^\/api\/games\/[^/]+\/guesses$/.test(url.pathname)) {
      const { answer } = request.postDataJSON();
      const correct = answer.trim().toLowerCase() === "grand theft auto v";
      const attempts = currentGame.attempts + 1;
      currentGame = {
        ...currentGame,
        attempts,
        blur_percentage: correct ? 0 : Math.max(0, 100 - attempts * 20),
        status: correct ? "won" : attempts === 5 ? "lost" : "active",
        answer: correct || attempts === 5 ? "Grand Theft Auto V" : null,
        guesses: [...currentGame.guesses, { answer, correct }],
      };
      return json(route, currentGame);
    }

    if (url.pathname === "/api/clue-games" && method === "POST") {
      clueId += 1;
      return json(
        route,
        {
          id: `10000000-0000-0000-0000-${String(clueId).padStart(12, "0")}`,
          status: "active",
          guesses: [],
        },
        201,
      );
    }

    if (url.pathname === "/api/clue-games/search") {
      return json(route, ["Grand Theft Auto V"]);
    }

    if (/^\/api\/clue-games\/[^/]+\/guesses$/.test(url.pathname)) {
      return json(route, {
        title: "Grand Theft Auto V",
        complete: true,
        comparisons: [
          {
            field: "console",
            value: "PS4",
            result: "correct",
            direction: null,
          },
          {
            field: "release_year",
            value: 2018,
            result: "correct",
            direction: null,
          },
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
          {
            field: "total_sales",
            value: 1,
            result: "correct",
            direction: null,
          },
        ],
      });
    }

    if (/^\/api\/clue-games\/[^/]+\/hints$/.test(url.pathname)) {
      return json(route, { field: "console", value: "PS4" });
    }

    if (url.pathname === "/api/favorites" && method === "GET") {
      return json(route, favorites);
    }

    if (/^\/api\/favorites\/[^/]+$/.test(url.pathname) && method === "PUT") {
      const { rounds } = request.postDataJSON();
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
      return json(route, favorite);
    }

    if (/^\/api\/favorites\/[^/]+$/.test(url.pathname) && method === "PATCH") {
      const id = url.pathname.split("/").at(-1);
      const { position } = request.postDataJSON();
      const reordered = [...favorites];
      const from = reordered.findIndex((favorite) => favorite.id === id);
      const [moved] = reordered.splice(from, 1);
      reordered.splice(position - 1, 0, moved);
      favorites = reordered.map((favorite, index) => ({
        ...favorite,
        position: index + 1,
      }));
      return json(route, favorites);
    }

    if (/^\/api\/favorites\/[^/]+$/.test(url.pathname) && method === "DELETE") {
      const id = url.pathname.split("/").at(-1);
      favorites = favorites.filter((favorite) => favorite.id !== id);
      return route.fulfill({ status: 204 });
    }

    throw new Error(`Unexpected API request: ${method} ${url.pathname}`);
  });
}

test("the frontend consumes the API for cover games and clue hints", async ({
  page,
}) => {
  const apiRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      apiRequests.push(request.url());
    }
  });
  await mockApi(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Qual é o jogo\?/ }),
  ).toBeVisible();
  await expect(page.getByText("0 tentativas usadas")).toBeVisible();

  const guessInput = page.getByLabel("Seu palpite");
  await guessInput.fill("Grand");
  await page.getByRole("button", { name: "Grand Theft Auto V" }).click();
  await page.getByRole("button", { name: "Chutar" }).click();
  await expect(page.getByText("1 registro")).toBeVisible();

  await page.reload();
  await expect(page.getByText("0 tentativas usadas")).toBeVisible();

  await page.getByRole("button", { name: "Pistas" }).click();
  await expect(
    page.getByRole("heading", { name: /Qual jogo combina com estas pistas/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajuda (5)" }).click();
  await expect(page.getByText(/Console:/)).toBeVisible();

  expect(apiRequests.some((url) => url.includes("/api/games"))).toBe(true);
  expect(apiRequests.some((url) => url.includes("/api/clue-games"))).toBe(true);
});

test("a failed daily game ends after five API responses", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  const guessInput = page.getByLabel("Seu palpite");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await guessInput.fill(`Palpite incorreto ${attempt}`);
    await page.getByRole("button", { name: "Chutar" }).click();
  }

  await expect(page.getByText("5 tentativas usadas")).toBeVisible();
  await expect(page.getByText("Fim de jogo")).toBeVisible();
  await expect(guessInput).toBeDisabled();
});

test("clue mode renders comparisons returned by the API", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Pistas" }).click();

  await page.getByPlaceholder("Digite o nome do jogo").fill("Grand");
  await page.getByRole("button", { name: "Grand Theft Auto V" }).click();
  await page.getByRole("button", { name: "Chutar" }).click();

  const result = page.locator("article").filter({
    hasText: "Grand Theft Auto V",
  });
  await expect(result).toBeVisible();
  for (const label of [
    "Console",
    "Ano",
    "Publicadora",
    "Desenvolvedora",
    "Vendas",
  ]) {
    await expect(result.getByText(label, { exact: true })).toBeVisible();
  }
});

test("a failed streak can be saved through the favorites API", async ({
  page,
}) => {
  const apiRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      apiRequests.push(request);
    }
  });
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Sequ/ }).click();

  const guessInput = page.getByLabel("Seu palpite");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await guessInput.fill(`Palpite incorreto ${attempt}`);
    await page.getByRole("button", { name: "Chutar" }).click();
  }

  await page
    .getByRole("button", { name: /Adicionar sequência aos favoritos/ })
    .click();
  await expect(
    page.getByRole("button", { name: /Sequência favoritada/ }),
  ).toBeVisible();
  await expect(page.getByText(/Rodada 1/)).toBeVisible();
  await expect(page.getByText(/5 chutes/)).toBeVisible();
  expect(
    apiRequests.some(
      (request) =>
        request.method() === "PUT" &&
        new URL(request.url()).pathname.startsWith("/api/favorites/"),
    ),
  ).toBe(true);
});
