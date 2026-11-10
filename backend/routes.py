from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import contains_eager, joinedload

from extensions import db
from models import Book, Category
from schemas import validate_book_payload, validate_borrow_payload

books_bp = Blueprint("books", __name__, url_prefix="/api/books")


def _get_book_or_404(book_id: int) -> tuple[Book | None, tuple | None]:
    stmt = (
        select(Book)
        .options(joinedload(Book.category_rel))
        .where(Book.id == book_id)
    )
    book = db.session.execute(stmt).scalar_one_or_none()
    if book is None:
        return None, (jsonify({"error": "Book not found"}), 404)
    return book, None


def _get_or_create_category(name: str) -> Category:
    stmt = select(Category).where(func.lower(Category.name) == name.lower())
    category = db.session.execute(stmt).scalar_one_or_none()
    if category is None:
        category = Category(name=name)
        db.session.add(category)
        db.session.flush()
    return category


@books_bp.get("")
def list_books():
    search = (request.args.get("search") or "").strip()
    category = (request.args.get("category") or "").strip()
    sort = (request.args.get("sort") or "newest").strip().lower()

    if category:
        stmt = (
            select(Book)
            .join(Book.category_rel)
            .options(contains_eager(Book.category_rel))
            .where(func.lower(Category.name) == category.lower())
        )
    else:
        stmt = select(Book).options(joinedload(Book.category_rel))

    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(or_(Book.title.ilike(pattern), Book.author.ilike(pattern)))

    if sort == "title":
        stmt = stmt.order_by(func.lower(Book.title).asc(), Book.id.asc())
    elif sort == "year_desc":
        stmt = stmt.order_by(Book.published_year.desc(), Book.id.desc())
    elif sort == "year_asc":
        stmt = stmt.order_by(Book.published_year.asc(), Book.id.asc())
    else:
        stmt = stmt.order_by(Book.created_at.desc(), Book.id.desc())

    books = db.session.execute(stmt).scalars().all()
    return jsonify([book.to_dict() for book in books]), 200


@books_bp.post("")
def create_book():
    payload = request.get_json(silent=True)
    cleaned, err = validate_book_payload(payload)
    if err:
        return jsonify({"error": err}), 400

    category = _get_or_create_category(cleaned["category"])
    book = Book(
        title=cleaned["title"],
        author=cleaned["author"],
        category_rel=category,
        published_year=cleaned["published_year"],
    )
    db.session.add(book)
    db.session.commit()
    return jsonify(book.to_dict()), 201


@books_bp.get("/<int:book_id>")
def get_book(book_id: int):
    book, error_response = _get_book_or_404(book_id)
    if error_response:
        return error_response
    return jsonify(book.to_dict()), 200


@books_bp.put("/<int:book_id>")
def update_book(book_id: int):
    book, error_response = _get_book_or_404(book_id)
    if error_response:
        return error_response

    payload = request.get_json(silent=True)
    cleaned, err = validate_book_payload(payload)
    if err:
        return jsonify({"error": err}), 400

    category = _get_or_create_category(cleaned["category"])
    book.title = cleaned["title"]
    book.author = cleaned["author"]
    book.category_rel = category
    book.published_year = cleaned["published_year"]

    db.session.commit()
    return jsonify(book.to_dict()), 200


@books_bp.delete("/<int:book_id>")
def delete_book(book_id: int):
    book, error_response = _get_book_or_404(book_id)
    if error_response:
        return error_response

    if book.is_borrowed:
        return jsonify({"error": "Borrowed book cannot be deleted until it is returned"}), 409

    db.session.delete(book)
    db.session.commit()
    return "", 204


@books_bp.post("/<int:book_id>/borrow")
def borrow_book(book_id: int):
    book, error_response = _get_book_or_404(book_id)
    if error_response:
        return error_response

    if book.is_borrowed:
        return jsonify({"error": "Book is already borrowed"}), 409

    payload = request.get_json(silent=True)
    borrower_name, err = validate_borrow_payload(payload)
    if err:
        return jsonify({"error": err}), 400

    book.is_borrowed = True
    book.borrower_name = borrower_name
    db.session.commit()
    return jsonify(book.to_dict()), 200


@books_bp.post("/<int:book_id>/return")
def return_book(book_id: int):
    book, error_response = _get_book_or_404(book_id)
    if error_response:
        return error_response

    if not book.is_borrowed:
        return jsonify({"error": "Book is not currently borrowed"}), 409

    book.is_borrowed = False
    book.borrower_name = None
    db.session.commit()
    return jsonify(book.to_dict()), 200

