import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from uuid import UUID, uuid4


class GameStatus(StrEnum):
    ACTIVE = "active"
    WON = "won"
    LOST = "lost"


class GameMode(StrEnum):
    DAILY = "daily"
    STREAK = "streak"


@dataclass(frozen=True)
class GameDefinition:
    title: str
    image_url: str


@dataclass(frozen=True)
class Guess:
    answer: str
    correct: bool


@dataclass
class Game:
    id: UUID
    definition: GameDefinition
    mode: GameMode = GameMode.DAILY
    attempts: int = 0
    blur_percentage: int = 100
    status: GameStatus = GameStatus.ACTIVE
    guesses: list[Guess] = field(default_factory=list)

    max_attempts = 5
    blur_step = 20

    def guess(self, answer: str) -> bool:
        if self.status != GameStatus.ACTIVE:
            raise ValueError("game_finished")

        self.attempts += 1
        is_correct = normalize(answer) == normalize(self.definition.title)
        self.guesses.append(Guess(answer=answer.strip(), correct=is_correct))

        if is_correct:
            self.status = GameStatus.WON
            self.blur_percentage = 0
        elif self.mode == GameMode.STREAK or self.attempts >= self.max_attempts:
            self.status = GameStatus.LOST
        else:
            self.blur_percentage = max(0, 100 - self.attempts * self.blur_step)

        return is_correct


def normalize(value: str) -> str:
    return " ".join(value.strip().casefold().split())


class GameService:
    def __init__(self, catalog: tuple[GameDefinition, ...]) -> None:
        self.catalog = catalog
        self.games: dict[UUID, Game] = {}

    def start_game(self, mode: GameMode = GameMode.DAILY) -> Game:
        if mode == GameMode.DAILY:
            catalog_index = (
                datetime.now(UTC).date().toordinal() % len(self.catalog)
            )
        else:
            catalog_index = len(self.games) % len(self.catalog)

        definition = self.catalog[catalog_index]
        game = Game(id=uuid4(), definition=definition, mode=mode)
        self.games[game.id] = game
        return game

    def get_game(self, game_id: UUID) -> Game | None:
        return self.games.get(game_id)

    def search_titles(self, query: str, limit: int = 8) -> list[str]:
        normalized_query = normalize(query)
        if not normalized_query:
            return []

        return [
            game.title
            for game in self.catalog
            if normalized_query in normalize(game.title)
        ][:limit]


def load_catalog(dataset_path: Path) -> tuple[GameDefinition, ...]:
    with dataset_path.open(encoding="utf-8") as dataset_file:
        payload = json.load(dataset_file)

    catalog: list[GameDefinition] = []
    seen_games: set[str] = set()

    for record in payload.get("results", []):
        title = str(record.get("game_name", "")).strip()
        image_url = str(record.get("cover_url", "")).strip()
        game_key = normalize(title)

        if not title or not image_url or game_key in seen_games:
            continue

        seen_games.add(game_key)
        catalog.append(GameDefinition(title=title, image_url=image_url))

    if not catalog:
        raise ValueError("Dataset does not contain valid games")

    return tuple(catalog)


DATASET_PATH = Path(__file__).resolve().parents[2] / "jogos.json"
CATALOG = load_catalog(DATASET_PATH)
