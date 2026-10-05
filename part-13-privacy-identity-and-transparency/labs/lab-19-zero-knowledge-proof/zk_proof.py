"""Small Schnorr proof-of-knowledge model; not production cryptography."""

from dataclasses import dataclass
from hashlib import sha256

P = 23
Q = 11
G = 2


@dataclass(frozen=True)
class Proof:
    commitment: int
    response: int


def public_key(secret: int) -> int:
    if not 1 <= secret < Q:
        raise ValueError("secret must be in [1, Q)")
    return pow(G, secret, P)


def challenge(public: int, commitment: int, statement: bytes) -> int:
    transcript = b"|".join(
        (str(G).encode(), str(public).encode(), str(commitment).encode(), statement)
    )
    return int.from_bytes(sha256(transcript).digest(), "big") % Q


def prove(secret: int, nonce: int, statement: bytes) -> Proof:
    if not 1 <= nonce < Q:
        raise ValueError("nonce must be in [1, Q)")
    public = public_key(secret)
    commitment = pow(G, nonce, P)
    response = (nonce + challenge(public, commitment, statement) * secret) % Q
    return Proof(commitment, response)


def verify(public: int, statement: bytes, proof: Proof) -> bool:
    if not (1 <= public < P and 1 <= proof.commitment < P and 0 <= proof.response < Q):
        return False
    c = challenge(public, proof.commitment, statement)
    return pow(G, proof.response, P) == (
        proof.commitment * pow(public, c, P)
    ) % P


def recover_reused_nonce_secret(
    public: int,
    statement_a: bytes,
    proof_a: Proof,
    statement_b: bytes,
    proof_b: Proof,
) -> int:
    if proof_a.commitment != proof_b.commitment:
        raise ValueError("the proofs do not reuse a commitment")
    c_a = challenge(public, proof_a.commitment, statement_a)
    c_b = challenge(public, proof_b.commitment, statement_b)
    denominator = (c_a - c_b) % Q
    if denominator == 0:
        raise ValueError("the challenges do not permit recovery")
    return ((proof_a.response - proof_b.response) * pow(denominator, -1, Q)) % Q


def demonstration() -> dict[str, int | bool]:
    secret = 7
    nonce = 3
    public = public_key(secret)
    first_statement = b"age-at-least-18"
    second_statement = b"balance-at-least-100"
    first = prove(secret, nonce, first_statement)
    second = prove(secret, nonce, second_statement)
    return {
        "public_key": public,
        "commitment": first.commitment,
        "first_challenge": challenge(public, first.commitment, first_statement),
        "first_response": first.response,
        "valid": verify(public, first_statement, first),
        "tampered_valid": verify(public, b"age-at-least-21", first),
        "recovered_secret": recover_reused_nonce_secret(
            public, first_statement, first, second_statement, second
        ),
    }


if __name__ == "__main__":
    for name, value in demonstration().items():
        print(f"{name}={value}")
