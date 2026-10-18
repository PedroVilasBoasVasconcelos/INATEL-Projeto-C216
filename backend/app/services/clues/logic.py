import json
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import Protocol
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.clue import ClueSessionModel
from app.services.games.logic import normalize


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


class ClueRepository(Protocol):
    def create(
        self, session: Session, game_id: UUID, target: ClueGameDefinition
    ) -> None: ...

    def get(self, session: Session, game_id: UUID) -> ClueSessionModel | None: ...

    def save_state(
        self,
        session: Session,
        game_id: UUID,
        guesses: list[dict[str, object]],
        used_hints: list[str],
    ) -> None: ...


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


CLUE_DATASET_PATH = Path(__file__).resolve().parents[4] / "jogos_vendas.json"
CLUE_CATALOG = load_clue_catalog(CLUE_DATASET_PATH)


class ClueGameService:
    def __init__(
        self,
        catalog: tuple[ClueGameDefinition, ...],
        repository: ClueRepository,
    ) -> None:
        self.catalog = catalog
        self.repository = repository

    def start_game(self, session: Session) -> UUID:
        target = self.catalog[
            datetime.now().astimezone().date().toordinal() % len(self.catalog)
        ]
        game_id = uuid4()
        self.repository.create(session, game_id, target)
        return game_id

    def get_game(
        self, session: Session, game_id: UUID
    ) -> tuple[ClueGameDefinition, list[ClueGuess], set[str]] | None:
        game = self.repository.get(session, game_id)
        if game is None:
            return None
        target = ClueGameDefinition(
            title=game.title,
            console=game.console,
            release_year=game.release_year,
            publisher=game.publisher,
            developer=game.developer,
            total_sales=game.total_sales,
        )
        guesses = [
            ClueGuess(
                title=str(record["title"]),
                complete=bool(record["complete"]),
                comparisons=[
                    ClueComparison(
                        field=str(comparison["field"]),
                        value=comparison["value"],
                        result=ClueResult(str(comparison["result"])),
                        direction=comparison["direction"],
                    )
                    for comparison in record["comparisons"]
                ],
            )
            for record in game.guesses
        ]
        return target, guesses, set(game.used_hints)

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
            (
                game
                for game in self.catalog
                if normalize(game.title) == normalized_title
            ),
            None,
        )

    def guess(self, session: Session, game_id: UUID, title: str) -> ClueGuess:
        state = self.get_game(session, game_id)
        if state is None:
            raise ValueError("game_not_found")
        target, guesses, used_hints = state
        if guesses and guesses[-1].complete:
            raise ValueError("game_finished")

        candidate = (
            target
            if normalize(title) == normalize(target.title)
            else self.find_game(title)
        )
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
        result = ClueGuess(
            title=candidate.title, comparisons=comparisons, complete=complete
        )
        guesses.append(result)
        self.repository.save_state(
            session,
            game_id,
            [self._serialize_guess(guess) for guess in guesses],
            sorted(used_hints),
        )
        return result

    def hint(self, session: Session, game_id: UUID) -> ClueHint:
        state = self.get_game(session, game_id)
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
        self.repository.save_state(
            session,
            game_id,
            [self._serialize_guess(guess) for guess in guesses],
            sorted(used_hints),
        )
        return ClueHint(field=next_hint[0], value=next_hint[1])

    @staticmethod
    def _serialize_guess(guess: ClueGuess) -> dict[str, object]:
        return {
            "title": guess.title,
            "complete": guess.complete,
            "comparisons": [
                {
                    "field": comparison.field,
                    "value": comparison.value,
                    "result": comparison.result.value,
                    "direction": comparison.direction,
                }
                for comparison in guess.comparisons
            ],
        }


def compare_text(field: str, value: str, target: str) -> ClueComparison:
    result = (
        ClueResult.CORRECT
        if normalize(value) == normalize(target)
        else ClueResult.WRONG
    )
    return ClueComparison(field=field, value=value, result=result)


def compare_year(value: int, target: int) -> ClueComparison:
    difference = abs(value - target)
    result = (
        ClueResult.CORRECT
        if difference == 0
        else ClueResult.CLOSE
        if difference <= 2
        else ClueResult.WRONG
    )
    direction = "up" if value < target else "down" if value > target else None
    return ClueComparison("release_year", value, result, direction)


def compare_sales(value: float, target: float) -> ClueComparison:
    difference = abs(value - target) / target if target else 0
    result = (
        ClueResult.CORRECT
        if value == target
        else ClueResult.CLOSE
        if difference <= 0.2
        else ClueResult.WRONG
    )
    direction = "up" if value < target else "down" if value > target else None
    return ClueComparison("total_sales", value, result, direction)
