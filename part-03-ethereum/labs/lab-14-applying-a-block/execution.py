"""Applying a block of signed transfers to Ethereum-style account state.

Chapter 9 describes Ethereum as a shared state machine: a block is an ordered
list of transactions, and applying it moves every node from one world state to
the same next one. This module is that sentence made executable.

It models the parts that decide whether a transaction is valid at all --- the
sender recovered from the signature, the nonce, the balance, and the gas the
sender must pay for --- and commits the result to a state root, so that two
nodes applying the same block can be shown to agree.

Deliberately omitted: contract code and storage, the EVM itself, EIP-1559 base
fee burning, access lists, and the real Merkle-Patricia trie. The state root
here is an ordered hash over the accounts, which has the property the lesson
needs (any change to any account changes the root) without the trie machinery
that Chapter 9 does not develop.

SAFETY: every key here is generated from a fixed constant in this file. They are
public by definition. Never use them on any network.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace

from keccak import keccak256

# secp256k1 domain parameters.
P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G = (
    0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
    0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8,
)

#: Gas every transfer costs before anything else happens.
INTRINSIC_GAS = 21_000

Point = tuple[int, int] | None
Address = bytes


# --- curve arithmetic -------------------------------------------------------


def point_add(a: Point, b: Point) -> Point:
    if a is None:
        return b
    if b is None:
        return a
    if a[0] == b[0] and (a[1] + b[1]) % P == 0:
        return None
    if a == b:
        slope = 3 * a[0] * a[0] * pow(2 * a[1], -1, P) % P
    else:
        slope = (b[1] - a[1]) * pow(b[0] - a[0], -1, P) % P
    x = (slope * slope - a[0] - b[0]) % P
    return (x, (slope * (a[0] - x) - a[1]) % P)


def point_mul(k: int, point: Point = G) -> Point:
    k %= N
    if k == 0:
        return None
    result: Point = None
    addend = point
    while k:
        if k & 1:
            result = point_add(result, addend)
        addend = point_add(addend, addend)
        k >>= 1
    return result


def public_key(private_key: int) -> Point:
    if not 1 <= private_key < N:
        raise ValueError("a private key must be an integer in [1, n-1]")
    point = point_mul(private_key)
    assert point is not None
    return point


def address_of(point: Point) -> Address:
    """An Ethereum address is the last 20 bytes of the hash of the public key.

    The 0x04 prefix is dropped first: only the 64 coordinate bytes are hashed.
    """
    if point is None:
        raise ValueError("the point at infinity has no address")
    body = point[0].to_bytes(32, "big") + point[1].to_bytes(32, "big")
    return keccak256(body)[12:]


def address_of_key(private_key: int) -> Address:
    return address_of(public_key(private_key))


# --- signing and sender recovery --------------------------------------------


@dataclass(frozen=True)
class Signature:
    r: int
    s: int
    recovery_id: int


def _sign_hash(private_key: int, digest: bytes, nonce: int) -> Signature:
    z = int.from_bytes(digest, "big")
    point = point_mul(nonce)
    assert point is not None
    r = point[0] % N
    s = pow(nonce, -1, N) * (z + r * private_key) % N
    if r == 0 or s == 0:
        raise ValueError("degenerate nonce, choose another")
    recovery_id = (point[1] & 1) ^ (1 if s > N // 2 else 0)
    if s > N // 2:
        s = N - s
    return Signature(r, s, recovery_id)


def recover_public_key(digest: bytes, signature: Signature) -> Point:
    """Recover the signer's public key from the signature and the message hash.

    This is why an Ethereum transaction carries no `from` field: the sender is
    not asserted by the transaction, it is computed from the signature. A
    transaction claiming a sender it cannot sign for simply recovers to a
    different address, which almost certainly has no balance.
    """
    r, s = signature.r, signature.s
    if not (1 <= r < N and 1 <= s < N and signature.recovery_id in (0, 1)):
        raise ValueError("malformed signature")
    # Rebuild the point R whose x coordinate is r.
    y_squared = (pow(r, 3, P) + 7) % P
    y = pow(y_squared, (P + 1) // 4, P)
    if (y * y - y_squared) % P != 0:
        raise ValueError("no curve point has this r")
    if (y & 1) != signature.recovery_id:
        y = P - y
    R = (r, y)
    z = int.from_bytes(digest, "big")
    r_inverse = pow(r, -1, N)
    point = point_add(point_mul(s, R), point_mul((-z) % N, G))
    return point_mul(r_inverse, point)


# --- transactions -----------------------------------------------------------


@dataclass(frozen=True)
class Transaction:
    """A value transfer. There is no `from`: the sender comes from the signature."""

    to: Address
    value: int
    nonce: int
    gas_price: int
    gas_limit: int = INTRINSIC_GAS
    signature: Signature | None = None

    def signing_bytes(self) -> bytes:
        return b"|".join(
            [
                b"transfer",
                self.to,
                str(self.value).encode(),
                str(self.nonce).encode(),
                str(self.gas_price).encode(),
                str(self.gas_limit).encode(),
            ]
        )

    def hash(self) -> bytes:
        return keccak256(self.signing_bytes())


def sign_transaction(transaction: Transaction, private_key: int) -> Transaction:
    """Sign with a nonce derived from the key and the transaction hash."""
    digest = transaction.hash()
    seed = keccak256(private_key.to_bytes(32, "big") + digest)
    nonce = int.from_bytes(seed, "big") % (N - 1) + 1
    return replace(transaction, signature=_sign_hash(private_key, digest, nonce))


def sender_of(transaction: Transaction) -> Address:
    if transaction.signature is None:
        raise ValueError("an unsigned transaction has no sender")
    return address_of(recover_public_key(transaction.hash(), transaction.signature))


# --- world state ------------------------------------------------------------


class TransactionRejected(Exception):
    """Raised when a transaction cannot be included at all."""


@dataclass
class Account:
    balance: int = 0
    nonce: int = 0


@dataclass
class Receipt:
    transaction_hash: bytes
    sender: Address
    succeeded: bool
    gas_used: int
    fee_paid: int
    reason: str = ""


@dataclass
class WorldState:
    accounts: dict[Address, Account] = field(default_factory=dict)

    def account(self, address: Address) -> Account:
        return self.accounts.setdefault(address, Account())

    def balance_of(self, address: Address) -> int:
        return self.accounts.get(address, Account()).balance

    def nonce_of(self, address: Address) -> int:
        return self.accounts.get(address, Account()).nonce

    def credit(self, address: Address, amount: int) -> None:
        self.account(address).balance += amount

    def copy(self) -> "WorldState":
        return WorldState({a: Account(x.balance, x.nonce) for a, x in self.accounts.items()})

    def root(self) -> bytes:
        """An ordered commitment to every account.

        Sorting by address makes the result independent of insertion order, so
        two nodes that applied the same transactions agree even though their
        dictionaries were built differently.
        """
        body = b"".join(
            address + account.balance.to_bytes(32, "big") + account.nonce.to_bytes(8, "big")
            for address, account in sorted(self.accounts.items())
        )
        return keccak256(body)


def apply_transaction(
    state: WorldState, transaction: Transaction, coinbase: Address
) -> Receipt:
    """Apply one transaction, charging the sender for gas either way.

    A transaction that cannot pay its own gas is not includable at all and
    raises. A transaction that can pay but cannot afford the transfer is
    included and fails: the gas is still spent, which is what stops a node from
    being made to do free work.
    """
    sender = sender_of(transaction)
    account = state.account(sender)
    fee = transaction.gas_limit * transaction.gas_price

    if transaction.nonce != account.nonce:
        raise TransactionRejected(
            f"nonce {transaction.nonce} does not follow {account.nonce}"
        )
    if account.balance < fee:
        raise TransactionRejected("sender cannot cover the gas")
    if transaction.gas_limit < INTRINSIC_GAS:
        raise TransactionRejected("gas limit below the intrinsic cost")

    account.nonce += 1
    account.balance -= fee
    state.credit(coinbase, fee)

    if account.balance < transaction.value:
        return Receipt(
            transaction.hash(), sender, False, INTRINSIC_GAS, fee, "insufficient balance"
        )

    account.balance -= transaction.value
    state.credit(transaction.to, transaction.value)
    return Receipt(transaction.hash(), sender, True, INTRINSIC_GAS, fee, "")


def apply_block(
    state: WorldState, transactions: list[Transaction], coinbase: Address
) -> tuple[list[Receipt], bytes]:
    """Apply an ordered block and return its receipts and the resulting root."""
    receipts = [apply_transaction(state, tx, coinbase) for tx in transactions]
    return receipts, state.root()
