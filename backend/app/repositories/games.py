from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.game import GameGuessModel, GameSessionModel
from app.services.games.logic import Game, GameDefinition, GameMode, GameStatus, Guess


class GamesRepository:
    def count(self, session: Session) -> int:
        return session.scalar(select(func.count()).select_from(GameSessionModel)) or 0

    def get(self, session: Session, game_id: UUID) -> Game | None:
        statement = (
            select(GameSessionModel)
            .options(selectinload(GameSessionModel.guesses))
            .where(GameSessionModel.id == game_id)
        )
        model = session.scalar(statement)
        if model is None:
            return None
        return Game(
            id=model.id,
            definition=GameDefinition(model.title, model.image_url),
            mode=GameMode(model.mode),
            attempts=model.attempts,
            blur_percentage=model.blur_percentage,
            status=GameStatus(model.status),
            guesses=[Guess(item.answer, item.correct) for item in model.guesses],
        )

    def save(self, session: Session, game: Game) -> None:
        model = session.get(GameSessionModel, game.id)
        if model is None:
            model = GameSessionModel(id=game.id)
            session.add(model)

        model.title = game.definition.title
        model.image_url = game.definition.image_url
        model.mode = game.mode.value
        model.attempts = game.attempts
        model.blur_percentage = game.blur_percentage
        model.status = game.status.value
        model.guesses = [
            GameGuessModel(position=index, answer=item.answer, correct=item.correct)
            for index, item in enumerate(game.guesses, start=1)
        ]
        session.commit()
