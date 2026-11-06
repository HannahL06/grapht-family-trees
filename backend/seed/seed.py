"""Wipes the database and creates a small sample family for manual testing.

Run from backend/: python -m seed.seed

Structure (20 people, 4 generations):
  Gen 1: Ada + Bram (grandparent couple)
  Gen 2: their children Cora, Dan, Faye (siblings), each married to someone
         marrying into the family (Hank, Gail, Ivan)
  Gen 3: children of the Gen 2 couples. Eli (Cora+Hank's child) and Ivy
         (Dan+Gail's child) are first cousins (share grandparents Ada & Bram)
         and are married to each other -- the cousin-marriage test case.
         Other Gen 3 people marry in from outside (Quinn, Rose, Tara).
  Gen 4: children of the Gen 3 couples, including Eli+Ivy's child Uma.
  Jon: one unrelated person, for negative-test queries (no shared ancestors).
"""

import uuid

from app.core.db import run_query
from seed.demo_account import DEMO_EMAIL, ensure_demo_account

TREE_ID = "sample-fam"


def person(name: str, birth_year: int | None = None) -> dict:
    return {"id": str(uuid.uuid4()), "tree_id": TREE_ID, "name": name, "birth_year": birth_year}


def main() -> None:
    run_query("MATCH (n) DETACH DELETE n")

    # Generation 1
    ada = person("Ada", 1910)
    bram = person("Bram", 1908)

    # Generation 2: Ada & Bram's children (siblings), plus who they married
    cora = person("Cora", 1935)
    dan = person("Dan", 1937)
    faye = person("Faye", 1939)
    hank = person("Hank", 1934)   # marries Cora, marries into the family
    gail = person("Gail", 1936)   # marries Dan, marries into the family
    ivan = person("Ivan", 1938)   # marries Faye, marries into the family

    # Generation 3: children of the Gen 2 couples
    eli = person("Eli", 1960)     # Cora + Hank
    mia = person("Mia", 1962)     # Cora + Hank
    ivy = person("Ivy", 1961)     # Dan + Gail -- Eli's first cousin
    noah = person("Noah", 1963)   # Dan + Gail
    oscar = person("Oscar", 1964)  # Faye + Ivan
    quinn = person("Quinn", 1961)  # marries Mia, marries into the family
    rose = person("Rose", 1962)    # marries Noah, marries into the family
    tara = person("Tara", 1963)    # marries Oscar, marries into the family

    # Generation 4: children of the Gen 3 couples
    uma = person("Uma", 1985)     # Eli + Ivy (the cousin-marriage couple)
    vic = person("Vic", 1986)     # Mia + Quinn
    emily = person("Emily", 1987)  # Noah + Rose

    # Unrelated person, for negative-test queries
    jon = person("Jon", 1965)

    people = [ada, bram, cora, dan, faye, hank, gail, ivan, eli, mia, ivy,
              noah, oscar, quinn, rose, tara, uma, vic, emily, jon]
    assert len(people) == 20

    run_query(
        "UNWIND $people AS p "
        "CREATE (:Person {id: p.id, tree_id: p.tree_id, name: p.name, birth_year: p.birth_year})",
        {"people": people},
    )

    parent_of_pairs = [
        (ada, cora), (bram, cora),
        (ada, dan), (bram, dan),
        (ada, faye), (bram, faye),
        (cora, eli), (hank, eli),
        (cora, mia), (hank, mia),
        (dan, ivy), (gail, ivy),
        (dan, noah), (gail, noah),
        (faye, oscar), (ivan, oscar),
        (eli, uma), (ivy, uma),
        (mia, vic), (quinn, vic),
        (noah, wendy), (rose, wendy),
    ]
    run_query(
        "UNWIND $pairs AS pair "
        "MATCH (parent:Person {id: pair.parent_id}), (child:Person {id: pair.child_id}) "
        "MERGE (parent)-[:PARENT_OF]->(child)",
        {"pairs": [{"parent_id": p["id"], "child_id": c["id"]} for p, c in parent_of_pairs]},
    )

    married_pairs = [
        (ada, bram),
        (cora, hank),
        (dan, gail),
        (faye, ivan),
        (eli, ivy),   # the cousin marriage
        (mia, quinn),
        (noah, rose),
        (oscar, tara),
    ]
    run_query(
        "UNWIND $pairs AS pair "
        "MATCH (a:Person {id: pair.a_id}), (b:Person {id: pair.b_id}) "
        "MERGE (a)-[:MARRIED_TO]->(b)",
        {"pairs": [{"a_id": a["id"], "b_id": b["id"]} for a, b in married_pairs]},
    )

    [node_count] = run_query(
        "MATCH (p:Person {tree_id: $tid}) RETURN count(p) AS c", {"tid": TREE_ID}
    )
    [edge_count] = run_query(
        "MATCH (:Person {tree_id: $tid})-[r]->(:Person {tree_id: $tid}) RETURN count(r) AS c",
        {"tid": TREE_ID},
    )
    print(f"Created {node_count['c']} Person nodes and {edge_count['c']} relationships "
          f"for tree_id='{TREE_ID}'.")
    print(f"Cousin-marriage pair (share grandparents Ada & Bram): "
          f"Eli ({eli['id']}) and Ivy ({ivy['id']}).")
    print(f"Unrelated person for negative tests: Jon ({jon['id']}).")

    # main() wiped the whole database, including users and trees, so the
    # demo account has to be recreated for the demo page to work.
    ensure_demo_account(TREE_ID)
    print(f"Demo account recreated: {DEMO_EMAIL} owns tree '{TREE_ID}'.")


if __name__ == "__main__":
    main()
