import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DEFAULT_SQLITE_PATH = (
    "/tmp/library.db"
    if os.environ.get("VERCEL")
    else os.path.join(BASE_DIR, "library.db")
)


class Config:
    """Default Flask configuration using local SQLite database."""

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{DEFAULT_SQLITE_PATH}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class TestConfig(Config):
    """Isolated configuration for pytest runs."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

