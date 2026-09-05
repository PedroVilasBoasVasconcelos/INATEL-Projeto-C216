from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID, uuid4


class GameStatus(StrEnum):
    ACTIVE = "active"
    WON = "won"
    LOST = "lost"


@dataclass(frozen=True)
class GameDefinition:
    title: str
    image_url: str


@dataclass
class Game:
    id: UUID
    definition: GameDefinition
    attempts: int = 0
    blur_percentage: int = 100
    status: GameStatus = GameStatus.ACTIVE

    max_attempts = 5
    blur_step = 20

    def guess(self, answer: str) -> bool:
        if self.status != GameStatus.ACTIVE:
            raise ValueError("game_finished")

        self.attempts += 1
        is_correct = normalize(answer) == normalize(self.definition.title)

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

    def start_game(self) -> Game:
        definition = self.catalog[len(self.games) % len(self.catalog)]
        game = Game(id=uuid4(), definition=definition)
        self.games[game.id] = game
        return game

    def get_game(self, game_id: UUID) -> Game | None:
        return self.games.get(game_id)


CATALOG = (
    GameDefinition(
        title="Hollow Knight",
        image_url="https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg",
    ),
    GameDefinition(
        title="The Legend of Zelda: Breath of the Wild",
        image_url="https://images.igdb.com/igdb/image/upload/t_cover_big/co3vp2.jpg",
    ),
    GameDefinition(
        title="Stardew Valley",
        image_url="https://images.igdb.com/igdb/image/upload/t_cover_big/co1y5b.jpg",
    ),
)
