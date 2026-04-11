"""Run Phase 2 migrations against the configured database."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import get_pool

MIGRATION_FILES = [
    "migrations/004_phase2_soothe.sql",
    "migrations/005_phase2_soundscape.sql",
    "migrations/006_phase2_voice.sql",
    "migrations/007_phase2_books.sql",
    "migrations/008_phase2_memory.sql",
]

def run():
    pool = get_pool()
    for path in MIGRATION_FILES:
        full = os.path.join(os.path.dirname(__file__), path)
        if not os.path.exists(full):
            print(f"⚠️  Missing: {path}")
            continue
        sql = open(full).read()
        with pool.connection() as conn:
            conn.execute(sql)
            conn.commit()
        print(f"✅ Applied: {path}")
    print("\n🎉 All Phase 2 migrations applied!")

if __name__ == "__main__":
    run()
