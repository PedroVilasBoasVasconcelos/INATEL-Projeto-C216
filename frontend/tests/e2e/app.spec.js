import { expect, test } from "@playwright/test";

test("the frontend runs locally and keeps game state in memory only", async ({
  page,
}) => {
  const apiRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      apiRequests.push(request.url());
    }
  });

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
  await expect(page.getByRole("button", { name: "Ajuda (4)" })).toBeVisible();

  expect(apiRequests).toEqual([]);
});

test("the daily game ends after five wrong guesses", async ({ page }) => {
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

test("clue mode shows game attribute comparisons after a guess", async ({
  page,
}) => {
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

test("a failed streak can be saved to favorites", async ({ page }) => {
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
});
