from datetime import datetime, timezone


def _clean_required_string(data: dict, field: str, label: str) -> tuple[str | None, str | None]:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        return None, f"{label} is required"
    cleaned = value.strip()
    if len(cleaned) > 200:
        return None, f"{label} must be at most 200 characters"
    return cleaned, None


def _clean_category(data: dict) -> tuple[str | None, str | None]:
    raw = data.get("category")
    if raw is None:
        return "General", None
    if not isinstance(raw, str):
        return None, "Category must be a string"
    cleaned = raw.strip() or "General"
    if len(cleaned) > 80:
        return None, "Category must be at most 80 characters"
    return cleaned, None


def _clean_published_year(data: dict) -> tuple[int | None, str | None]:
    raw = data.get("published_year")
    current_year = datetime.now(timezone.utc).year

    if raw is None or isinstance(raw, bool):
        return None, f"Published year must be an integer between 1900 and {current_year}"

    if isinstance(raw, int):
        year = raw
    elif isinstance(raw, str) and raw.strip().isdigit():
        year = int(raw.strip())
    else:
        return None, f"Published year must be an integer between 1900 and {current_year}"

    if year < 1900 or year > current_year:
        return None, f"Published year must be between 1900 and {current_year}"

    return year, None


def validate_book_payload(data: object) -> tuple[dict | None, str | None]:
    """Validate create/update book payload and return cleaned dict or error message."""
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object"

    title, err = _clean_required_string(data, "title", "Title")
    if err:
        return None, err

    author, err = _clean_required_string(data, "author", "Author")
    if err:
        return None, err

    category, err = _clean_category(data)
    if err:
        return None, err

    published_year, err = _clean_published_year(data)
    if err:
        return None, err

    return {
        "title": title,
        "author": author,
        "category": category,
        "published_year": published_year,
    }, None


def validate_borrow_payload(data: object) -> tuple[str | None, str | None]:
    """Validate borrow payload and return cleaned borrower_name or error message."""
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object"

    borrower_name, err = _clean_required_string(data, "borrower_name", "Borrower name")
    if err:
        return None, err

    return borrower_name, None

