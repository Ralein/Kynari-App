#!/usr/bin/env python3
"""Dataset Management Utility.

This script helps extract and format data from Kynari's ML analysis sessions
for future model fine-tuning.
"""

import sys
import json
import logging
from pathlib import Path
import psycopg
from psycopg.rows import dict_row

# Add the api module path
API_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(API_DIR))

from config import get_settings  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dataset_manager")

def get_connection():
    settings = get_settings()
    return psycopg.connect(settings.database_url, row_factory=dict_row)

def export_sessions_to_jsonl(output_file: str, modality: str = None):
    """Export analysis sessions to JSONL format."""
    query = "SELECT * FROM analysis_sessions"
    params = []
    
    if modality:
        query += " WHERE modality = %s"
        params.append(modality)
        
    query += " ORDER BY created_at DESC"
    
    count = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            
            with open(output_file, 'w', encoding='utf-8') as f:
                for row in rows:
                    # Convert to JSON serializable dict
                    record = {
                        "id": str(row["id"]),
                        "child_id": str(row["child_id"]),
                        "modality": row["modality"],
                        "emotion_label": row["emotion_label"],
                        "confidence": row["confidence"],
                        "raw_result": row["raw_result"],
                        "created_at": row["created_at"].isoformat()
                    }
                    f.write(json.dumps(record) + '\n')
                    count += 1
                    
    logger.info(f"Exported {count} sessions to {output_file}")


def export_events_to_csv(output_file: str):
    """Export emotion events to CSV."""
    import csv
    
    query = """
        SELECT e.id, e.child_id, e.emotion_label, e.confidence, e.modality, e.timestamp, c.date_of_birth
        FROM emotion_events e
        JOIN children c ON e.child_id = c.id
        ORDER BY e.timestamp DESC
    """
    
    count = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            
            if not rows:
                logger.info("No events to export.")
                return
                
            keys = rows[0].keys()
            
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                for row in rows:
                    if row["timestamp"]:
                         row["timestamp"] = row["timestamp"].isoformat()
                    if row["date_of_birth"]:
                         row["date_of_birth"] = row["date_of_birth"].isoformat()
                    writer.writerow(row)
                    count += 1
                    
    logger.info(f"Exported {count} events to {output_file}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Kynari Dataset Manager")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Export sessions command
    export_sessions_parser = subparsers.add_parser("export-sessions", help="Export raw analysis sessions to JSONL")
    export_sessions_parser.add_parser("export-sessions", help="Export raw analysis sessions")
    export_sessions_parser.add_argument("--out", "-o", default="sessions.jsonl", help="Output file path")
    export_sessions_parser.add_argument("--modality", "-m", choices=["face", "voice", "combined"], help="Filter by modality")
    
    # Export events command
    export_events_parser = subparsers.add_parser("export-events", help="Export emotion events to CSV")
    export_events_parser.add_argument("--out", "-o", default="events.csv", help="Output file path")
    
    args = parser.parse_args()
    
    if args.command == "export-sessions":
        export_sessions_to_jsonl(args.out, args.modality)
    elif args.command == "export-events":
        export_events_to_csv(args.out)
