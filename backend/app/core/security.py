from pwdlib import PasswordHash

# Argon2id, per OWASP's Password Storage Cheat Sheet and the current FastAPI
# docs — PasswordHash.recommended() picks this as pwdlib's recommended scheme.
password_hasher = PasswordHash.recommended()


def hash_password(plain_password: str) -> str:
    return password_hasher.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return password_hasher.verify(plain_password, password_hash)
