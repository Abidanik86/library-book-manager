import argparse
import sys

from sqlalchemy import func, select

from extensions import db
from models import Book, Category

SAMPLE_BOOKS = [
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "category": "Technology",
        "published_year": 2008,
        "is_borrowed": True,
        "borrower_name": "Nadia Rahman",
    },
    {
        "title": "Designing Data-Intensive Applications",
        "author": "Martin Kleppmann",
        "category": "Technology",
        "published_year": 2017,
        "is_borrowed": False,
        "borrower_name": None,
    },
    {
        "title": "A Brief History of Time",
        "author": "Stephen Hawking",
        "category": "Science",
        "published_year": 1988,
        "is_borrowed": False,
        "borrower_name": None,
    },
    {
        "title": "The Selfish Gene",
        "author": "Richard Dawkins",
        "category": "Science",
        "published_year": 1976,
        "is_borrowed": True,
        "borrower_name": "Tariq Hasan",
    },
    {
        "title": "Sapiens: A Brief History of Humankind",
        "author": "Yuval Noah Harari",
        "category": "History",
        "published_year": 2011,
        "is_borrowed": False,
        "borrower_name": None,
    },
    {
        "title": "Guns, Germs, and Steel",
        "author": "Jared Diamond",
        "category": "History",
        "published_year": 1997,
        "is_borrowed": False,
        "borrower_name": None,
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "category": "Fiction",
        "published_year": 1949,
        "is_borrowed": True,
        "borrower_name": "Farhana Akter",
    },
    {
        "title": "Dune",
        "author": "Frank Herbert",
        "category": "Fiction",
        "published_year": 1965,
        "is_borrowed": False,
        "borrower_name": None,
    },
    {
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "category": "Fiction",
        "published_year": 1960,
        "is_borrowed": False,
        "borrower_name": None,
    },
    {
        "title": "Steve Jobs",
        "author": "Walter Isaacson",
        "category": "Biography",
        "published_year": 2011,
        "is_borrowed": False,
        "borrower_name": None,
    },
]


def seed_if_empty(reset: bool = False, quiet: bool = False) -> int:
    """Seed 10 sample books inside an active Flask app context."""
    if reset:
        db.session.query(Book).delete()
        db.session.query(Category).delete()
        db.session.commit()

    existing_count = db.session.query(Book).count()
    if existing_count > 0:
        if not quiet:
            print(f"Database already contains {existing_count} book(s). Use --reset to re-seed.")
        return 0

    categories_by_name: dict[str, Category] = {}
    for item in SAMPLE_BOOKS:
        cat_name = item["category"]
        if cat_name not in categories_by_name:
            cat = db.session.execute(
                select(Category).where(func.lower(Category.name) == cat_name.lower())
            ).scalar_one_or_none()
            if cat is None:
                cat = Category(name=cat_name)
                db.session.add(cat)
                db.session.flush()
            categories_by_name[cat_name] = cat

        book = Book(
            title=item["title"],
            author=item["author"],
            category_rel=categories_by_name[cat_name],
            published_year=item["published_year"],
            is_borrowed=item["is_borrowed"],
            borrower_name=item["borrower_name"],
        )
        db.session.add(book)

    db.session.commit()
    if not quiet:
        print(f"Seeded {len(SAMPLE_BOOKS)} sample books.")
    return len(SAMPLE_BOOKS)


def seed_books(reset: bool = False) -> int:
    """CLI helper to seed 10 sample books."""
    from app import create_app

    app = create_app()
    with app.app_context():
        return seed_if_empty(reset=reset)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed sample library books.")
    parser.add_argument("--reset", action="store_true", help="Clear existing books and re-seed.")
    args = parser.parse_args()
    seed_books(reset=args.reset)
    sys.exit(0)
