# Library Book Manager

A full-stack library catalog and borrowing tracker built with **Python (Flask + SQLite + SQLAlchemy)** and **AngularJS 1.8 (`ngRoute` + Bootstrap 5)**.

## Project Structure

```text
library-book-manager/
├── backend/
│   ├── app.py                 # Flask app factory, CORS, JSON error handlers
│   ├── config.py              # SQLite & test database config
│   ├── extensions.py          # SQLAlchemy instance (expire_on_commit=False)
│   ├── models.py              # Category & Book models (lazy="raise" to prevent N+1)
│   ├── schemas.py             # Input validation helpers
│   ├── routes.py              # /api/books REST endpoints with eager loading
│   ├── seed.py                # Seeds 10 sample books
│   ├── requirements.txt
│   └── tests/
│       ├── conftest.py
│       └── test_books.py      # pytest suite (CRUD, 400/409 rules, no-N+1 assertion)
└── frontend/
    ├── index.html             # App shell (Bootstrap 5 + AngularJS 1.8 + ngRoute)
    ├── css/
    │   └── styles.css         # Minimal responsive styling
    └── app/
        ├── app.module.js      # Module definition and ngRoute configuration
        ├── services/
        │   └── book.service.js        # All $http calls live here
        ├── controllers/
        │   ├── book-list.controller.js
        │   └── book-form.controller.js
        └── views/
            ├── book-list.html
            └── book-form.html
```

---

## Setup & Run Instructions

### 1. Backend (Flask + SQLite)

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- **Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

Install dependencies, seed 10 sample books, and start the API server:

```bash
pip install -r requirements.txt
python seed.py
python app.py
```

The backend runs at `http://127.0.0.1:5000`.

> To reset and re-seed the database at any time:
> ```bash
> python seed.py --reset
> ```

### 2. Frontend (AngularJS 1.8)

In a second terminal, serve `frontend/` over a local HTTP server (so `ngRoute` template loading and CORS work cleanly):

```bash
cd frontend
python -m http.server 5500
```

Then open **http://127.0.0.1:5500/#!/books** in your browser.

---

## Running Backend Tests

From `backend/` (with `.venv` activated):

```bash
pytest -v
```

The test suite (`backend/tests/test_books.py`) verifies:
- Adding a book (`201`) and listing books (`200`)
- Borrowing the same book twice returns `409 Conflict`
- Invalid/malformed inputs return `400 Bad Request` (and never `500`)
- Deleting a borrowed book returns `409` until it is returned (`200` -> `204`)
- Editing, searching (`?search=`), and category filtering (`?category=`)
- **Zero N+1 queries:** `GET /api/books` executes exactly **1 SQL query** across 15+ books

---

## API Endpoints

| Method | Path | Purpose | Status Codes |
|---|---|---|---|
| `GET` | `/api/books` | List books (optional `?search=`, `?category=`, `?sort=`) | `200` |
| `POST` | `/api/books` | Add a book | `201`, `400` |
| `GET` | `/api/books/<id>` | Get a single book | `200`, `404` |
| `PUT` | `/api/books/<id>` | Update a book | `200`, `400`, `404` |
| `DELETE` | `/api/books/<id>` | Delete a book | `204`, `404`, `409` |
| `POST` | `/api/books/<id>/borrow` | Borrow a book (`{"borrower_name": "..."}`) | `200`, `400`, `404`, `409` |
| `POST` | `/api/books/<id>/return` | Return a borrowed book | `200`, `404`, `409` |

All responses (including `400`, `404`, `405`, `409`, and unexpected errors) return JSON (`{"error": "..."}`).

### Eager Loading / No N+1 Design
`Book` references a normalized `Category` table (`category_rel`) configured with `lazy="raise"`. Any accidental lazy-loading inside a loop fails loudly instead of silently issuing N+1 queries. Queries in `backend/routes.py` explicitly use `joinedload(Book.category_rel)` (or `join(...)` + `contains_eager(...)` when filtering by category) so listing books always runs in a single SQL `JOIN` query.

---

## What I Would Improve With More Time

1. **Borrow History Audit Log:** Add a `borrow_records` table (eager-loaded via `selectinload`) to track past borrowers, borrow timestamps, and return timestamps instead of only storing the current borrower.
2. **Server-Side Pagination:** Add `page` and `per_page` metadata to `GET /api/books` so the list scales smoothly to thousands of books.
3. **Database Migrations & Containerization:** Introduce Alembic (`Flask-Migrate`) for schema changes and a `docker-compose.yml` for one-command startup.
4. **Frontend Unit & E2E Tests:** Add Jasmine/Karma tests for `BookService` and controllers, plus a Playwright smoke test for the borrow/return flow.
5. **Authentication & Role Access:** Add librarian login (JWT or session cookies) so write operations require authorization.

---

## Note on AI Tools Usage

AI assistance was used during Part 1 to:
- Scaffold the initial Flask blueprint/SQLAlchemy boilerplate and Bootstrap 5 + AngularJS 1.8 responsive CSS layout.
- Review edge cases for input validation (ensuring malformed payloads never trigger a 500 error) and write the SQLAlchemy query-count assertion in `pytest`.

All API contracts, business rules, eager-loading behavior, and frontend flows were reviewed, executed, and verified locally.

