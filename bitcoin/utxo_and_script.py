"""Bitcoin transaction structure, the UTXO model, and Script for Chapter 7.

The serialization here is the real consensus format, and the tests verify it by
reproducing the genesis block's transaction id and block hash from first
principles. The UTXO set, coin selection, and Script interpreter are reduced
teaching models: they implement the rules this chapter explains and omit
everything it does not.

No network access, node, wallet, key, or funds are required.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

COIN = 100_000_000  # satoshis per bitcoin
SEQUENCE_FINAL = 0xFFFFFFFF
COINBASE_TXID = b"\x00" * 32
COINBASE_VOUT = 0xFFFFFFFF


def sha256d(data: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def hash160(data: bytes) -> bytes:
    try:
        rip = hashlib.new("ripemd160", hashlib.sha256(data).digest()).digest()
    except ValueError:  # pragma: no cover - depends on the OpenSSL build
        from ripemd160 import ripemd160

        rip = ripemd160(hashlib.sha256(data).digest())
    return rip


def varint(n: int) -> bytes:
    """Bitcoin's compact size encoding for lengths and counts."""
    if n < 0xFD:
        return bytes([n])
    if n <= 0xFFFF:
        return b"\xfd" + n.to_bytes(2, "little")
    if n <= 0xFFFFFFFF:
        return b"\xfe" + n.to_bytes(4, "little")
    return b"\xff" + n.to_bytes(8, "little")


# --- Transaction structure ---------------------------------------------------

@dataclass(frozen=True)
class OutPoint:
    """A reference to one previous output: which transaction, which index."""

    txid: bytes  # internal byte order
    vout: int

    def serialize(self) -> bytes:
        return self.txid + self.vout.to_bytes(4, "little")


@dataclass(frozen=True)
class TxIn:
    """An input. It spends exactly one previous output, in full."""

    prevout: OutPoint
    script_sig: bytes = b""
    sequence: int = SEQUENCE_FINAL

    def serialize(self) -> bytes:
        return (
            self.prevout.serialize()
            + varint(len(self.script_sig))
            + self.script_sig
            + self.sequence.to_bytes(4, "little")
        )


@dataclass(frozen=True)
class TxOut:
    """An output: an amount in satoshis and the condition to spend it."""

    value: int
    script_pubkey: bytes

    def serialize(self) -> bytes:
        return (
            self.value.to_bytes(8, "little")
            + varint(len(self.script_pubkey))
            + self.script_pubkey
        )


@dataclass(frozen=True)
class Transaction:
    version: int = 1
    inputs: tuple[TxIn, ...] = ()
    outputs: tuple[TxOut, ...] = ()
    locktime: int = 0

    def serialize(self) -> bytes:
        parts = [self.version.to_bytes(4, "little"), varint(len(self.inputs))]
        parts += [i.serialize() for i in self.inputs]
        parts.append(varint(len(self.outputs)))
        parts += [o.serialize() for o in self.outputs]
        parts.append(self.locktime.to_bytes(4, "little"))
        return b"".join(parts)

    def txid(self) -> str:
        """Return the transaction id in the reversed order explorers display."""
        return sha256d(self.serialize())[::-1].hex()

    def is_coinbase(self) -> bool:
        return (
            len(self.inputs) == 1
            and self.inputs[0].prevout.txid == COINBASE_TXID
            and self.inputs[0].prevout.vout == COINBASE_VOUT
        )


def block_header_hash(
    version: int, prev_hash: bytes, merkle_root: bytes, time: int, bits: int, nonce: int
) -> str:
    """Hash an 80-byte header, as Chapter 4 described."""
    header = (
        version.to_bytes(4, "little")
        + prev_hash
        + merkle_root
        + time.to_bytes(4, "little")
        + bits.to_bytes(4, "little")
        + nonce.to_bytes(4, "little")
    )
    assert len(header) == 80
    return sha256d(header)[::-1].hex()


# --- Script ------------------------------------------------------------------

OP_DUP = 0x76
OP_EQUAL = 0x87
OP_EQUALVERIFY = 0x88
OP_HASH160 = 0xA9
OP_CHECKSIG = 0xAC
OP_RETURN = 0x6A


def p2pkh_script_pubkey(pubkey_hash: bytes) -> bytes:
    """The classic 'pay to public key hash' spending condition."""
    return bytes([OP_DUP, OP_HASH160, len(pubkey_hash)]) + pubkey_hash + bytes(
        [OP_EQUALVERIFY, OP_CHECKSIG]
    )


def p2pkh_script_sig(signature: bytes, pubkey: bytes) -> bytes:
    """The data a spender supplies: a signature and the public key."""
    return bytes([len(signature)]) + signature + bytes([len(pubkey)]) + pubkey


class ScriptError(Exception):
    pass


def run_script(
    script: bytes, stack: list[bytes] | None = None, check_signature=None
) -> list[bytes]:
    """Evaluate a minimal subset of Script against a stack.

    Script is a stack language with no loops, which is why validation always
    terminates. `check_signature` stands in for real signature verification so
    the structure can be demonstrated without any key material.
    """
    stack = list(stack or [])
    i = 0
    while i < len(script):
        op = script[i]
        i += 1
        if 1 <= op <= 75:  # push that many bytes
            stack.append(script[i : i + op])
            i += op
        elif op == OP_DUP:
            if not stack:
                raise ScriptError("OP_DUP on empty stack")
            stack.append(stack[-1])
        elif op == OP_HASH160:
            if not stack:
                raise ScriptError("OP_HASH160 on empty stack")
            stack.append(hash160(stack.pop()))
        elif op == OP_EQUAL:
            b, a = stack.pop(), stack.pop()
            stack.append(b"\x01" if a == b else b"")
        elif op == OP_EQUALVERIFY:
            b, a = stack.pop(), stack.pop()
            if a != b:
                raise ScriptError("OP_EQUALVERIFY failed")
        elif op == OP_CHECKSIG:
            pubkey, signature = stack.pop(), stack.pop()
            ok = check_signature(signature, pubkey) if check_signature else False
            stack.append(b"\x01" if ok else b"")
        else:
            raise ScriptError(f"unsupported opcode 0x{op:02x}")
    return stack


def verify_p2pkh(script_sig: bytes, script_pubkey: bytes, check_signature) -> bool:
    """Run the spending data, then the condition, and inspect the result."""
    try:
        stack = run_script(script_sig, check_signature=check_signature)
        stack = run_script(script_pubkey, stack, check_signature=check_signature)
    except (ScriptError, IndexError):
        return False
    return bool(stack) and stack[-1] != b""


# --- The UTXO set ------------------------------------------------------------

@dataclass
class UtxoSet:
    """The set of outputs that exist and have not been spent.

    A node keeps this because it is what validation actually consults: a
    payment is valid only if every input names an entry that is still here.
    """

    entries: dict[tuple[str, int], TxOut] = field(default_factory=dict)

    def add_transaction(self, tx: Transaction) -> None:
        # Validate every input before mutating the set. Transaction application
        # is atomic: a bad later input must not consume an earlier valid one.
        spent: list[tuple[str, int]] = []
        if not tx.is_coinbase():
            for tx_in in tx.inputs:
                key = (tx_in.prevout.txid[::-1].hex(), tx_in.prevout.vout)
                if key in spent or key not in self.entries:
                    raise ValueError(f"input spends unknown or spent output {key}")
                spent.append(key)
        for key in spent:
            del self.entries[key]
        for index, tx_out in enumerate(tx.outputs):
            # Bitcoin Core omits provably unspendable data outputs from the
            # UTXO set because no future input can consume them.
            if not tx_out.script_pubkey.startswith(bytes([OP_RETURN])):
                self.entries[(tx.txid(), index)] = tx_out

    def balance(self, script_pubkey: bytes) -> int:
        return sum(
            out.value for out in self.entries.values() if out.script_pubkey == script_pubkey
        )

    def spendable(self, script_pubkey: bytes) -> list[tuple[tuple[str, int], TxOut]]:
        return [
            (key, out)
            for key, out in sorted(self.entries.items())
            if out.script_pubkey == script_pubkey
        ]


def select_coins(
    available: list[tuple[tuple[str, int], TxOut]], target: int
) -> list[tuple[tuple[str, int], TxOut]]:
    """Choose outputs to cover a target, largest first.

    Real wallets use far more careful strategies, because the choice affects
    fees and privacy. The point here is only that outputs are spent whole, so
    the selected total will usually overshoot.
    """
    chosen: list[tuple[tuple[str, int], TxOut]] = []
    total = 0
    for key, out in sorted(available, key=lambda kv: -kv[1].value):
        chosen.append((key, out))
        total += out.value
        if total >= target:
            return chosen
    raise ValueError(f"insufficient funds: have {total}, need {target}")


def transaction_fee(inputs_total: int, tx: Transaction) -> int:
    """Fee is what is left over. It is never an explicit field."""
    return inputs_total - sum(out.value for out in tx.outputs)


# --- Demonstration -----------------------------------------------------------

ALICE = hash160(b"alice public key")
BOB = hash160(b"bob public key")


def main() -> None:
    print("Reconstructing the genesis transaction from the consensus format")
    message = b"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"
    script_sig = bytes.fromhex("04ffff001d") + bytes([0x01, 0x04, len(message)]) + message
    pubkey = bytes.fromhex(
        "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb"
        "649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f"
    )
    genesis = Transaction(
        version=1,
        inputs=(TxIn(OutPoint(COINBASE_TXID, COINBASE_VOUT), script_sig),),
        outputs=(TxOut(50 * COIN, bytes([len(pubkey)]) + pubkey + bytes([OP_CHECKSIG])),),
    )
    print(f"  serialized: {len(genesis.serialize())} bytes")
    print(f"  txid:       {genesis.txid()}")
    print(f"  coinbase:   {genesis.is_coinbase()}")

    print("\n  The same bytes produce the genesis block hash:")
    merkle_root = sha256d(genesis.serialize())
    genesis_hash = block_header_hash(
        1, b"\x00" * 32, merkle_root, 1231006505, 0x1D00FFFF, 2083236893
    )
    print(f"  {genesis_hash}")

    print("\nThe UTXO set")
    utxos = UtxoSet()
    funding = Transaction(
        inputs=(TxIn(OutPoint(COINBASE_TXID, COINBASE_VOUT), b"\x01\x00"),),
        outputs=(
            TxOut(60_000_000, p2pkh_script_pubkey(ALICE)),
            TxOut(30_000_000, p2pkh_script_pubkey(ALICE)),
            TxOut(10_000_000, p2pkh_script_pubkey(BOB)),
        ),
    )
    utxos.add_transaction(funding)
    print(f"  entries: {len(utxos.entries)}")
    print(f"  Alice's balance: {utxos.balance(p2pkh_script_pubkey(ALICE)):,} satoshis")
    print("  Alice has no single 'balance' on chain -- she has two separate outputs.")

    print("\nSpending: outputs are consumed whole, so change is required")
    target, fee = 50_000_000, 2_000
    available = utxos.spendable(p2pkh_script_pubkey(ALICE))
    chosen = select_coins(available, target + fee)
    inputs_total = sum(out.value for _, out in chosen)
    change = inputs_total - target - fee
    print(f"  paying:        {target:,}")
    print(f"  selected:      {inputs_total:,} across {len(chosen)} output(s)")
    print(f"  change back:   {change:,}")
    print(f"  fee:           {fee:,}")

    spend = Transaction(
        inputs=tuple(
            TxIn(OutPoint(bytes.fromhex(k[0])[::-1], k[1])) for k, _ in chosen
        ),
        outputs=(
            TxOut(target, p2pkh_script_pubkey(BOB)),
            TxOut(change, p2pkh_script_pubkey(ALICE)),
        ),
    )
    print(f"  computed fee:  {transaction_fee(inputs_total, spend):,}")
    print("  The fee is implied by the gap, not written into the transaction.")

    print("\n  Forgetting the change output would donate it to the miner:")
    careless = Transaction(inputs=spend.inputs, outputs=(TxOut(target, p2pkh_script_pubkey(BOB)),))
    print(f"  fee then:      {transaction_fee(inputs_total, careless):,} satoshis")

    print("\nScript: the spending condition is a program")
    accept = lambda sig, pub: sig == b"valid-signature"
    good = p2pkh_script_sig(b"valid-signature", b"alice public key")
    bad_sig = p2pkh_script_sig(b"forged", b"alice public key")
    wrong_key = p2pkh_script_sig(b"valid-signature", b"bob public key")
    condition = p2pkh_script_pubkey(ALICE)
    print(f"  correct key and signature: {verify_p2pkh(good, condition, accept)}")
    print(f"  correct key, bad signature: {verify_p2pkh(bad_sig, condition, accept)}")
    print(f"  wrong key entirely:         {verify_p2pkh(wrong_key, condition, accept)}")


if __name__ == "__main__":
    main()
