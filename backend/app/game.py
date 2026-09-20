import json
from dataclasses import dataclass, field
from datetime import datetime
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
    CLUES = "clues"


@dataclass(frozen=True)
class GameDefinition:
    title: str
    image_url: str


@dataclass(frozen=True)
class ClueGameDefinition:
    title: str
    console: str
    release_year: int
    publisher: str
    developer: str
    total_sales: float


class ClueResult(StrEnum):
    CORRECT = "correct"
    CLOSE = "close"
    WRONG = "wrong"


@dataclass(frozen=True)
class ClueComparison:
    field: str
    value: str | int | float
    result: ClueResult
    direction: str | None = None


@dataclass
class ClueGuess:
    title: str
    comparisons: list[ClueComparison]
    complete: bool


@dataclass(frozen=True)
class ClueHint:
    field: str
    value: str | int | float


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
        elif self.attempts >= self.max_attempts:
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
                datetime.now().astimezone().date().toordinal() % len(self.catalog)
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
    with dataset_path.open(encoding="utf-8-sig") as dataset_file:
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


def parse_number(value: str) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0


def load_clue_catalog(dataset_path: Path) -> tuple[ClueGameDefinition, ...]:
    with dataset_path.open(encoding="utf-8-sig") as dataset_file:
        payload = json.load(dataset_file)
        catalog = []
        seen: set[tuple[str, str]] = set()

        for row in payload.get("results", []):
            title = str(row.get("game_name", "")).strip()
            console = str(row.get("console", "")).strip()
            key = (normalize(title), normalize(console))
            if not title or not console or key in seen:
                continue

            release_date = str(row.get("release_date", "")).strip()
            release_year = int(release_date[:4]) if release_date[:4].isdigit() else 0
            catalog.append(
                ClueGameDefinition(
                    title=title,
                    console=console,
                    release_year=release_year,
                    publisher=str(row.get("publisher", "")).strip(),
                    developer=str(row.get("developer", "")).strip(),
                    total_sales=parse_number(str(row.get("total_sales", ""))),
                )
            )
            seen.add(key)

    if not catalog:
        raise ValueError("CSV does not contain valid games")
    return tuple(catalog)


CLUE_DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "jogos_vendas.json"
)
CLUE_CATALOG = load_clue_catalog(CLUE_DATASET_PATH)


class ClueGameService:
    def __init__(self, catalog: tuple[ClueGameDefinition, ...]) -> None:
        self.catalog = catalog
        self.games: dict[UUID, tuple[ClueGameDefinition, list[ClueGuess], set[str]]] = {}

    def start_game(self) -> UUID:
        target = self.catalog[
            datetime.now().astimezone().date().toordinal() % len(self.catalog)
        ]
        game_id = uuid4()
        self.games[game_id] = (target, [], set())
        return game_id

    def get_game(
        self, game_id: UUID
    ) -> tuple[ClueGameDefinition, list[ClueGuess], set[str]] | None:
        return self.games.get(game_id)

    def search_titles(self, query: str, limit: int = 8) -> list[str]:
        normalized_query = normalize(query)
        if not normalized_query:
            return []
        titles = []
        seen: set[str] = set()
        for game in self.catalog:
            key = normalize(game.title)
            if normalized_query in key and key not in seen:
                titles.append(game.title)
                seen.add(key)
        return titles[:limit]

    def find_game(self, title: str) -> ClueGameDefinition | None:
        normalized_title = normalize(title)
        return next(
            (game for game in self.catalog if normalize(game.title) == normalized_title),
            None,
        )

    def guess(self, game_id: UUID, title: str) -> ClueGuess:
        state = self.games.get(game_id)
        if state is None:
            raise ValueError("game_not_found")
        target, guesses, _ = state
        if guesses and guesses[-1].complete:
            raise ValueError("game_finished")

        candidate = self.find_game(title)
        if candidate is None:
            raise ValueError("title_not_found")

        comparisons = [
            compare_text("console", candidate.console, target.console),
            compare_year(candidate.release_year, target.release_year),
            compare_text("publisher", candidate.publisher, target.publisher),
            compare_text("developer", candidate.developer, target.developer),
            compare_sales(candidate.total_sales, target.total_sales),
        ]
        complete = all(item.result == ClueResult.CORRECT for item in comparisons)
        result = ClueGuess(title=candidate.title, comparisons=comparisons, complete=complete)
        guesses.append(result)
        return result

    def hint(self, game_id: UUID) -> ClueHint:
        state = self.games.get(game_id)
        if state is None:
            raise ValueError("game_not_found")

        target, guesses, used_hints = state
        if guesses and guesses[-1].complete:
            raise ValueError("game_finished")

        fields = (
            ("console", target.console),
            ("release_year", target.release_year),
            ("publisher", target.publisher),
            ("developer", target.developer),
            ("total_sales", target.total_sales),
        )
        next_hint = next((hint for hint in fields if hint[0] not in used_hints), None)
        if next_hint is None:
            raise ValueError("no_hints_left")

        used_hints.add(next_hint[0])
        return ClueHint(field=next_hint[0], value=next_hint[1])


def compare_text(field: str, value: str, target: str) -> ClueComparison:
    result = ClueResult.CORRECT if normalize(value) == normalize(target) else ClueResult.WRONG
    return ClueComparison(field=field, value=value, result=result)


def compare_year(value: int, target: int) -> ClueComparison:
    difference = abs(value - target)
    result = ClueResult.CORRECT if difference == 0 else ClueResult.CLOSE if difference <= 2 else ClueResult.WRONG
    direction = "up" if value < target else "down" if value > target else None
    return ClueComparison("release_year", value, result, direction)


def compare_sales(value: float, target: float) -> ClueComparison:
    difference = abs(value - target) / target if target else 0
    result = ClueResult.CORRECT if value == target else ClueResult.CLOSE if difference <= 0.2 else ClueResult.WRONG
    direction = "up" if value < target else "down" if value > target else None
    return ClueComparison("total_sales", value, result, direction)
