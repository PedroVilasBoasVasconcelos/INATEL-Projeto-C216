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
