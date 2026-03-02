"""Database connection pool for Neon Postgres via psycopg v3."""

import json
import logging

import psycopg
import psycopg_pool
from psycopg.rows import dict_row

from config import get_settings

logger = logging.getLogger(__name__)

_pool: psycopg_pool.ConnectionPool | None = None


def get_pool() -> psycopg_pool.ConnectionPool:
    """Get or create the connection pool (lazy singleton)."""
    global _pool
    if _pool is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL not configured. "
                "Set DATABASE_URL in .env to your Neon connection string."
            )
        _pool = psycopg_pool.ConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
        )
    return _pool


def close_pool() -> None:
    """Close the connection pool (call on shutdown)."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
        logger.info("Database pool closed")


def try_connect_db() -> bool:
    """Attempt to connect to the database. Returns False if not configured."""
    settings = get_settings()
    if not settings.database_url:
        logger.warning(
            "⚠️  DATABASE_URL not configured — API running in offline mode."
        )
        return False
    try:
        pool = get_pool()
        with pool.connection() as conn:
            conn.execute("SELECT 1")
        logger.info("✅ Database connected (Neon Postgres)")
        return True
    except Exception as e:
        logger.warning(f"⚠️  Database connection failed: {e}")
        return False


# ─── Query Helpers ────────────────────────────────────────────


def fetch_one(sql: str, params: tuple | dict | None = None) -> dict | None:
    """Execute a query and return a single row as dict, or None."""
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def fetch_all(sql: str, params: tuple | dict | None = None) -> list[dict]:
    """Execute a query and return all rows as list of dicts."""
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def execute(sql: str, params: tuple | dict | None = None) -> None:
    """Execute a statement (INSERT/UPDATE/DELETE) without returning rows."""
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()


def execute_returning(sql: str, params: tuple | dict | None = None) -> dict | None:
    """Execute a statement and return the first row (for RETURNING clauses)."""
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
        return row


def execute_returning_all(sql: str, params: tuple | dict | None = None) -> list[dict]:
    """Execute a statement and return all rows (for batch RETURNING)."""
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
        conn.commit()
        return rows


def execute_values_returning(
    sql_template: str, values: list[tuple]
) -> list[dict]:
    """Batch insert using execute_values pattern with RETURNING.

    sql_template should have a single %s placeholder for VALUES, e.g.:
    INSERT INTO t (a, b) VALUES %s RETURNING *
    """
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            # Build VALUES clause
            placeholders = ", ".join(
                cur.mogrify("(" + ", ".join(["%s"] * len(v)) + ")", v).decode()
                if isinstance(cur.mogrify("", ()), bytes)
                else "(" + ", ".join(["%s"] * len(v)) + ")"
                for v in values
            )
            # Actually just use executemany or a single multi-row insert
            # psycopg v3 handles this well with execute + args_seq
            from psycopg.sql import SQL

            # Simpler approach: build multi-row INSERT
            if not values:
                return []

            cols_count = len(values[0])
            row_placeholder = "(" + ", ".join(["%s"] * cols_count) + ")"
            all_placeholders = ", ".join([row_placeholder] * len(values))

            # Flatten values
            flat_params = []
            for v in values:
                flat_params.extend(v)

            full_sql = sql_template.replace("%s", all_placeholders, 1)
            cur.execute(full_sql, flat_params)
            rows = cur.fetchall()
        conn.commit()
        return rows
