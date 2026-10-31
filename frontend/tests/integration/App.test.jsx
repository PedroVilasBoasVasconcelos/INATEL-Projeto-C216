import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../src/app/App.jsx";

describe("Termo de Jogos", () => {
  it("offers local suggestions and records a submitted guess", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Seu palpite"), "Grand");
    const suggestion = await screen.findByRole("button", {
      name: "Grand Theft Auto V",
    });
    await user.click(suggestion);
    await user.click(screen.getByRole("button", { name: "Chutar" }));

    await waitFor(() => {
      expect(screen.getByText("1 registro")).toBeInTheDocument();
    });
    expect(screen.getByText("Grand Theft Auto V")).toBeInTheDocument();
  });

  it("runs clue mode without a backend and shows a local hint", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Pistas" }));
    await user.click(screen.getByRole("button", { name: "Ajuda (5)" }));

    expect(screen.getByText(/Console:/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ajuda (4)" }),
    ).toBeInTheDocument();
  });

  it("records a wrong daily guess and keeps the round active", async () => {
    const user = userEvent.setup();
    render(<App />);

    const guessInput = screen.getByLabelText("Seu palpite");
    await user.type(guessInput, "Jogo fora do catálogo");
    await user.click(screen.getByRole("button", { name: "Chutar" }));

    expect(screen.getByText("1 tentativas usadas")).toBeInTheDocument();
    expect(screen.getByText("4 restantes")).toBeInTheDocument();
    expect(screen.getByText("Jogo fora do catálogo")).toBeInTheDocument();
    expect(guessInput).toBeEnabled();
  });

  it("compares a clue-mode guess with the local game catalog", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Pistas" }));
    await user.type(
      screen.getByPlaceholderText("Digite o nome do jogo"),
      "Grand",
    );
    await user.click(
      await screen.findByRole("button", { name: "Grand Theft Auto V" }),
    );
    await user.click(screen.getByRole("button", { name: "Chutar" }));

    expect(screen.getByText("Grand Theft Auto V")).toBeInTheDocument();
    for (const label of [
      "Console",
      "Ano",
      "Publicadora",
      "Desenvolvedora",
      "Vendas",
    ]) {
      expect(screen.getByText(label, { exact: true })).toBeInTheDocument();
    }
  });
});
