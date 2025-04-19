#!/usr/bin/env python3
import sqlite3, csv, os, sys

# Point at your SQLite file (strip "file:" if set)
db_url = os.getenv("DATABASE_URL", "file:./dev.db")
db_path = db_url[len("file:"):] if db_url.startswith("file:") else db_url

# Connect and query
conn = sqlite3.connect(db_path)
cur  = conn.cursor()
cur.execute("SELECT id, title, content FROM ForumPost;")
rows = cur.fetchall()
conn.close()

# Write CSV
out_path = "forum_posts.csv"
with open(out_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "title", "content"])
    writer.writerows(rows)

print(f"Wrote {len(rows)} rows to {out_path}")