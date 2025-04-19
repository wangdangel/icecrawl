#!/usr/bin/env python3
"""
Fetch ForumPost rows via SQLite, chunk them, and upsert into Qdrant.
"""
import os
import sqlite3
import logging

from vector_indexer.ingest import chunk_text
from api.indexer_client import IndexerClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Change this default to point at your dev.db
DB_URL   = os.getenv("DATABASE_URL", "file:./dev.db")
COL_NAME = "windsurf"
CHUNK_SZ = 500
OVERLAP  = 50
BATCH    = 100

def main():
    # 1) figure out actual file path
    if DB_URL.startswith("file:"):
        db_path = DB_URL[len("file:"):]
    else:
        db_path = DB_URL

    logger.info(f"Opening SQLite database at {db_path}")
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    # 1b) sanity check: what tables do we have?
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cur.fetchall()]
    logger.info(f"Found tables: {tables}")
    if "ForumPost" not in tables:
        logger.error("ForumPost table not found—check your schema!")
        return

    # 2) Fetch ForumPost rows
    cur.execute("SELECT id, title, content FROM ForumPost;")
    rows = cur.fetchall()
    logger.info(f"Fetched {len(rows)} ForumPosts")

    if not rows:
        return

    # 3) Chunk & batch‑upsert
    indexer = IndexerClient()
    buffer  = []
    total_chunks = 0

    for post_id, title, content in rows:
        text = f"{title or ''}\n\n{content}"
        for chunk in chunk_text(text, chunk_size=CHUNK_SZ, overlap=OVERLAP):
            buffer.append({"id": post_id, "text": chunk})
            total_chunks += 1
            if len(buffer) >= BATCH:
                indexer.add_documents(buffer, collection_name=COL_NAME)
                buffer.clear()

    # 4) flush remainder
    if buffer:
        indexer.add_documents(buffer, collection_name=COL_NAME)

    logger.info(
        f"Ingested {len(rows)} ForumPosts into ~{total_chunks} chunks in '{COL_NAME}'"
    )

if __name__ == "__main__":
    main()