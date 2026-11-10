from datetime import datetime, timezone

from sqlalchemy import event

from extensions import db


def test_add_book_success(client):
    payload = {
        "title": "The Pragmatic Programmer",
        "author": "Andrew Hunt",
        "category": "Technology",
        "published_year": 1999,
    }
    res = client.post("/api/books", json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data["title"] == "The Pragmatic Programmer"
    assert data["author"] == "Andrew Hunt"
    assert data["category"] == "Technology"
    assert data["published_year"] == 1999
    assert data["is_borrowed"] is False
    assert data["borrower_name"] is None
    assert "id" in data
    assert "created_at" in data

    list_res = client.get("/api/books")
    assert list_res.status_code == 200
    assert len(list_res.get_json()) == 1


def test_borrow_same_book_twice_returns_409(client):
    create_res = client.post(
        "/api/books",
        json={
            "title": "Clean Architecture",
            "author": "Robert C. Martin",
            "category": "Technology",
            "published_year": 2017,
        },
    )
    book_id = create_res.get_json()["id"]

    first_borrow = client.post(
        f"/api/books/{book_id}/borrow",
        json={"borrower_name": "Alice"},
    )
    assert first_borrow.status_code == 200
    assert first_borrow.get_json()["is_borrowed"] is True
    assert first_borrow.get_json()["borrower_name"] == "Alice"

    second_borrow = client.post(
        f"/api/books/{book_id}/borrow",
        json={"borrower_name": "Bob"},
    )
    assert second_borrow.status_code == 409
    assert "error" in second_borrow.get_json()


def test_invalid_input_returns_400_and_never_500(client):
    current_year = datetime.now(timezone.utc).year

    invalid_payloads = [
        {},
        {"title": "   ", "author": "Author", "published_year": 2020},
        {"title": "Book", "author": "", "published_year": 2020},
        {"title": "Book", "author": "Author", "published_year": 1899},
        {"title": "Book", "author": "Author", "published_year": current_year + 1},
        {"title": "Book", "author": "Author", "published_year": "not-a-year"},
        {"title": "Book", "author": "Author", "published_year": True},
        ["not", "an", "object"],
    ]

    for payload in invalid_payloads:
        res = client.post("/api/books", json=payload)
        assert res.status_code == 400
        assert "error" in res.get_json()

    malformed = client.post(
        "/api/books",
        data="{bad json",
        content_type="application/json",
    )
    assert malformed.status_code == 400
    assert "error" in malformed.get_json()


def test_delete_borrowed_book_returns_409_until_returned(client):
    create_res = client.post(
        "/api/books",
        json={
            "title": "Dune",
            "author": "Frank Herbert",
            "category": "Fiction",
            "published_year": 1965,
        },
    )
    book_id = create_res.get_json()["id"]

    client.post(f"/api/books/{book_id}/borrow", json={"borrower_name": "Rafiq"})

    blocked_delete = client.delete(f"/api/books/{book_id}")
    assert blocked_delete.status_code == 409
    assert "error" in blocked_delete.get_json()

    returned = client.post(f"/api/books/{book_id}/return")
    assert returned.status_code == 200
    assert returned.get_json()["is_borrowed"] is False
    assert returned.get_json()["borrower_name"] is None

    second_return = client.post(f"/api/books/{book_id}/return")
    assert second_return.status_code == 409

    allowed_delete = client.delete(f"/api/books/{book_id}")
    assert allowed_delete.status_code == 204


def test_edit_search_and_category_filter(client):
    b1 = client.post(
        "/api/books",
        json={
            "title": "Cosmos",
            "author": "Carl Sagan",
            "category": "Science",
            "published_year": 1980,
        },
    ).get_json()
    client.post(
        "/api/books",
        json={
            "title": "1984",
            "author": "George Orwell",
            "category": "Fiction",
            "published_year": 1949,
        },
    )

    update_res = client.put(
        f"/api/books/{b1['id']}",
        json={
            "title": "Cosmos (Updated)",
            "author": "Carl Sagan",
            "category": "Science",
            "published_year": 1981,
        },
    )
    assert update_res.status_code == 200
    assert update_res.get_json()["title"] == "Cosmos (Updated)"

    search_res = client.get("/api/books?search=sagan")
    assert search_res.status_code == 200
    assert len(search_res.get_json()) == 1

    cat_res = client.get("/api/books?category=Fiction")
    assert cat_res.status_code == 200
    assert len(cat_res.get_json()) == 1
    assert cat_res.get_json()[0]["title"] == "1984"


def test_list_books_uses_eager_loading_without_n_plus_1(app, client):
    for i in range(15):
        res = client.post(
            "/api/books",
            json={
                "title": f"Book {i}",
                "author": f"Author {i}",
                "category": f"Category {i % 5}",
                "published_year": 2000 + (i % 20),
            },
        )
        assert res.status_code == 201

    query_count = 0

    def count_queries(_conn, _cursor, _statement, _parameters, _context, _executemany):
        nonlocal query_count
        query_count += 1

    with app.app_context():
        event.listen(db.engine, "before_cursor_execute", count_queries)
        try:
            res = client.get("/api/books")
        finally:
            event.remove(db.engine, "before_cursor_execute", count_queries)

    assert res.status_code == 200
    assert len(res.get_json()) == 15
    assert query_count == 1

