import sqlite3
import json
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "price_cache.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_cache():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS price_cache (
            mpn           TEXT PRIMARY KEY,
            price         REAL,
            supplier      TEXT,
            stock         INTEGER,
            currency      TEXT,
            all_suppliers TEXT,
            fetched_at    REAL,
            ttl_hours     INTEGER DEFAULT 24
        )
    """)
    conn.commit()
    conn.close()


def _cache_key(mpn: str, total_qty: int) -> str:
    return f"{mpn.upper().strip()}__qty{total_qty}"


def get_cached(mpn: str, total_qty: int = 1):
    key = _cache_key(mpn, total_qty)
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM price_cache WHERE mpn = ?", (key,)
    ).fetchone()
    print(f"  CACHE RESULT: {'HIT' if row else 'MISS'}")  # ← add this
    conn.close()
    

    if not row:
        return None

    age_hours = (time.time() - row["fetched_at"]) / 3600
    if age_hours > row["ttl_hours"]:
        return None

    return {
        "price":         row["price"],
        "supplier":      row["supplier"],
        "stock":         row["stock"],
        "currency":      row["currency"],
        "all_suppliers": json.loads(row["all_suppliers"] or "[]"),
        "from_cache":    True,
    }


def set_cached(mpn: str, result: dict, total_qty: int = 1, ttl_hours: int = 24):
    key = _cache_key(mpn, total_qty)
    conn = get_db()
    conn.execute("""
        INSERT INTO price_cache
            (mpn, price, supplier, stock, currency, all_suppliers, fetched_at, ttl_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(mpn) DO UPDATE SET
            price         = excluded.price,
            supplier      = excluded.supplier,
            stock         = excluded.stock,
            currency      = excluded.currency,
            all_suppliers = excluded.all_suppliers,
            fetched_at    = excluded.fetched_at,
            ttl_hours     = excluded.ttl_hours
    """, (
        key,
        result.get("cheapest_price"),
        result.get("cheapest_supplier"),
        result.get("stock", 0),
        result.get("cheapest_currency", "EUR"),
        json.dumps(result.get("top3_suppliers", [])),
        time.time(),
        ttl_hours,
    ))
    conn.commit()
    conn.close()


def clear_expired():
    """Call this occasionally to keep the DB clean."""
    conn = get_db()
    conn.execute("""
        DELETE FROM price_cache
        WHERE (? - fetched_at) / 3600 > ttl_hours
    """, (time.time(),))
    conn.commit()
    conn.close()


def clear_mpn(mpn: str):
    """Force refresh a specific MPN regardless of qty."""
    conn = get_db()
    conn.execute(
        "DELETE FROM price_cache WHERE mpn LIKE ?",
        (f"{mpn.upper().strip()}%",)
    )
    conn.commit()
    conn.close()