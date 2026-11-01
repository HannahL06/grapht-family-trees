"""Creates the demo user and the 'sample-fam' Tree node, without touching any people.

Safe to run repeatedly (MERGE-based) and safe to run against data you've edited
by hand — unlike seed.py, it never deletes anything.

Run from backend/: python -m seed.demo_account

These are local demo credentials only. Do not reuse them anywhere real.
"""

import uuid
from datetime import datetime, timezone

from app.core.db import run_query
from app.core.security import hash_password

DEMO_NAME = "Demo User"
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo-password-change-me"
SAMPLE_TREE_ID = "sample-fam"
SAMPLE_TREE_NAME = "Sample Family"


def ensure_demo_account(tree_id: str = SAMPLE_TREE_ID) -> None:
    run_query(
        "MERGE (u:User {email: $email}) "
        "ON CREATE SET u.id = $id, u.name = $name, "
        "u.password_hash = $password_hash, u.created_at = $created_at",
        {
            "email": DEMO_EMAIL,
            "id": str(uuid.uuid4()),
            "name": DEMO_NAME,
            "password_hash": hash_password(DEMO_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    # The tree is owned by whichever demo user exists, whether just created
    # or already there from an earlier run.
    run_query(
        "MATCH (u:User {email: $email}) "
        "MERGE (t:Tree {id: $tree_id}) "
        "ON CREATE SET t.name = $tree_name, t.owner_id = u.id",
        {"email": DEMO_EMAIL, "tree_id": tree_id, "tree_name": SAMPLE_TREE_NAME},
    )


if __name__ == "__main__":
    ensure_demo_account()
    print(f"Demo account ready: {DEMO_EMAIL} owns tree '{SAMPLE_TREE_ID}'.")
