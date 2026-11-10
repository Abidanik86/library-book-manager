from datetime import datetime, timezone

from extensions import Base, db


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class Category(Base):
    """Normalized book category table to avoid duplicated strings and enforce eager loading."""

    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True, index=True)

    books = db.relationship("Book", back_populates="category_rel", lazy="raise")


class Book(Base):
    """Library book record."""

    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    author = db.Column(db.String(160), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False, index=True)
    published_year = db.Column(db.Integer, nullable=False)
    cover_url = db.Column(db.String(500), nullable=True)
    is_borrowed = db.Column(db.Boolean, nullable=False, default=False)
    borrower_name = db.Column(db.String(160), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    # lazy="raise" forbids implicit N+1 queries; callers must use joinedload(Book.category_rel).
    category_rel = db.relationship("Category", back_populates="books", lazy="raise")

    def to_dict(self) -> dict:
        """Serialize book to the required JSON shape."""
        return {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "category": self.category_rel.name,
            "published_year": self.published_year,
            "cover_url": self.cover_url,
            "is_borrowed": self.is_borrowed,
            "borrower_name": self.borrower_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

