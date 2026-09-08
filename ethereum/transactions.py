"""Ethereum transaction encoding: the exact bytes that get signed and hashed.

Companion to Chapter 11. This module covers one thing: how a transaction is
turned into bytes, what those bytes are hashed to produce the value a private
key signs, and how a transaction's hash follows from its signed form.

That is deliberately narrow. Nonce ordering, receipts, and fee arithmetic are
explained in the chapter's prose and are not modelled here; restating prose as
Python would produce tests that only confirm the code agrees with itself.

The verification that matters is the worked example published in EIP-155. That
document prints the signing bytes, the signing hash, and the fully signed
transaction for one concrete transfer, so the encoding implemented here is
checked against a published value rather than against its own assumptions.

There is no network access, no node, no wallet, and no key material: this
module does not sign, and signature values are supplied as inputs. All amounts
are integer wei; ether never appears as a float.

Encodings implemented here:
  EIP-155  https://eips.ethereum.org/EIPS/eip-155   (chain id inside the signature)
  EIP-2718 https://eips.ethereum.org/EIPS/eip-2718  (typed envelope)
  EIP-1559 https://eips.ethereum.org/EIPS/eip-1559  (fee-market payload)
"""

from __future__ import annotations

from dataclasses import dataclass

from keccak import keccak256

WEI_PER_ETHER = 10**18
WEI_PER_GWEI = 10**9

# Transaction type bytes of the EIP-2718 envelope. Legacy has no type byte.
TYPE_ACCESS_LIST = 0x01
TYPE_FEE_MARKET = 0x02
TYPE_BLOB = 0x03
TYPE_SET_CODE = 0x04


# --------------------------------------------------------------------------
# Recursive Length Prefix encoding
#
# RLP is the serialization Ethereum uses for transactions. It represents
# exactly two things: byte strings and lists of byte strings. It carries no
# type information, so a field's meaning comes entirely from its position --
# which is why changing the field list changes the format itself, the problem
# the typed envelope of EIP-2718 was introduced to solve.
# --------------------------------------------------------------------------


def rlp_encode(item) -> bytes:
    """Encode bytes, an int, or a (possibly nested) list of them."""
    if isinstance(item, bool):
        raise TypeError("cannot RLP-encode bool")
    if isinstance(item, int):
        return rlp_encode(encode_quantity(item))
    if isinstance(item, (bytes, bytearray)):
        return _rlp_bytes(bytes(item))
    if isinstance(item, (list, tuple)):
        payload = b"".join(rlp_encode(element) for element in item)
        return _rlp_prefix(len(payload), 0xC0) + payload
    raise TypeError(f"cannot RLP-encode {type(item).__name__}")


def encode_quantity(value: int) -> bytes:
    """Encode a non-negative integer big-endian, with no leading zeros.

    Zero encodes as the empty string, not as a zero byte. This is why an
    absent recipient and a zero value look alike on the wire.
    """
    if value < 0:
        raise ValueError("quantities are non-negative")
    if value == 0:
        return b""
    return value.to_bytes((value.bit_length() + 7) // 8, "big")


def _rlp_bytes(data: bytes) -> bytes:
    if len(data) == 1 and data[0] < 0x80:
        return data
    return _rlp_prefix(len(data), 0x80) + data


def _rlp_prefix(length: int, offset: int) -> bytes:
    if length < 56:
        return bytes([offset + length])
    encoded_length = encode_quantity(length)
    return bytes([offset + 55 + len(encoded_length)]) + encoded_length


# --------------------------------------------------------------------------
# Transactions
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class AccessListEntry:
    """One address and the storage keys declared alongside it."""

    address: bytes
    storage_keys: tuple[bytes, ...] = ()

    def as_rlp(self) -> list:
        return [self.address, list(self.storage_keys)]


@dataclass(frozen=True)
class LegacyTransaction:
    """The original format: a bare RLP list, with no type byte.

    ``to`` is empty for a contract creation.
    """

    nonce: int
    gas_price: int
    gas_limit: int
    to: bytes
    value: int
    data: bytes = b""


@dataclass(frozen=True)
class FeeMarketTransaction:
    """The EIP-1559 format, transaction type 0x02."""

    chain_id: int
    nonce: int
    max_priority_fee_per_gas: int
    max_fee_per_gas: int
    gas_limit: int
    to: bytes
    value: int
    data: bytes = b""
    access_list: tuple[AccessListEntry, ...] = ()


def legacy_signing_bytes(tx: LegacyTransaction, chain_id: int) -> bytes:
    """The exact bytes signed for a legacy transaction under EIP-155.

    EIP-155 hashes nine elements rather than six: the six original fields plus
    the chain id and two empty strings. The chain id is therefore inside what
    the signature commits to, which is what confines a signature to one
    network.
    """
    return rlp_encode(
        [tx.nonce, tx.gas_price, tx.gas_limit, tx.to, tx.value, tx.data,
         chain_id, 0, 0]
    )


def fee_market_signing_bytes(tx: FeeMarketTransaction) -> bytes:
    """The exact bytes signed for a fee-market transaction.

    Per EIP-2718 the type byte is the first byte of the signed data, so a
    signature made for one transaction type cannot be reused under another.
    """
    body = rlp_encode(
        [tx.chain_id, tx.nonce, tx.max_priority_fee_per_gas,
         tx.max_fee_per_gas, tx.gas_limit, tx.to, tx.value, tx.data,
         [entry.as_rlp() for entry in tx.access_list]]
    )
    return bytes([TYPE_FEE_MARKET]) + body


def signing_hash(signing_bytes: bytes) -> bytes:
    """Keccak-256 of the signing bytes. This is what the private key signs."""
    return keccak256(signing_bytes)


def signed_legacy_bytes(tx: LegacyTransaction, v: int, r: int, s: int) -> bytes:
    """The complete signed legacy transaction, as broadcast."""
    return rlp_encode(
        [tx.nonce, tx.gas_price, tx.gas_limit, tx.to, tx.value, tx.data, v, r, s]
    )


def legacy_v(chain_id: int, y_parity: int) -> int:
    """The EIP-155 ``v`` value: chain_id * 2 + 35 + parity.

    Legacy transactions have no chain id field, so the chain id is recovered
    from this value. Typed transactions carry it as a field instead and store
    the parity on its own.
    """
    if y_parity not in (0, 1):
        raise ValueError("y parity is 0 or 1")
    return chain_id * 2 + 35 + y_parity


def chain_id_from_v(v: int) -> int:
    """Recover the chain id from a legacy ``v``. Returns 0 for pre-EIP-155."""
    if v in (27, 28):
        return 0
    return (v - 35) // 2


def transaction_hash(raw: bytes) -> bytes:
    """A transaction's hash: Keccak-256 of its complete signed bytes.

    Because the signature is part of what is hashed, the hash cannot be known
    before signing, and any change to any field produces a different one.
    """
    return keccak256(raw)


# --------------------------------------------------------------------------
# The EIP-155 worked example, quoted from the EIP
# --------------------------------------------------------------------------

EIP155_TX = LegacyTransaction(
    nonce=9,
    gas_price=20 * 10**9,
    gas_limit=21000,
    to=bytes.fromhex("3535353535353535353535353535353535353535"),
    value=10**18,
    data=b"",
)
EIP155_CHAIN_ID = 1

EIP155_SIGNING_BYTES = bytes.fromhex(
    "ec098504a817c800825208943535353535353535353535353535353535353535"
    "880de0b6b3a764000080018080"
)
EIP155_SIGNING_HASH = bytes.fromhex(
    "daf5a779ae972f972197303d7b574746c7ef83eadac0f2791ad23db92e4c8e53"
)
EIP155_V = 37
EIP155_R = 18515461264373351373200002665853028612451056578545711640558177340181847433846
EIP155_S = 46948507304638947509940763649030358759909902576025900602547168820602576006531
EIP155_SIGNED = bytes.fromhex(
    "f86c098504a817c800825208943535353535353535353535353535353535353535"
    "880de0b6b3a76400008025a028ef61340bd939bc2195fe537567866003e1a15d3c"
    "71ff63e1590620aa636276a067cbe9d8997f761aecb703304b3800ccf555c9f3dc"
    "64214b297fb1966a3b6d83"
)

SEPOLIA_CHAIN_ID = 11155111


def main() -> None:
    print("The EIP-155 worked example")
    print("-" * 62)
    signing = legacy_signing_bytes(EIP155_TX, EIP155_CHAIN_ID)
    print(f"signing bytes   : {signing.hex()}")
    print(f"matches the EIP : {signing == EIP155_SIGNING_BYTES}")
    digest = signing_hash(signing)
    print(f"signing hash    : {digest.hex()}")
    print(f"matches the EIP : {digest == EIP155_SIGNING_HASH}")
    raw = signed_legacy_bytes(EIP155_TX, EIP155_V, EIP155_R, EIP155_S)
    print(f"signed tx       : {raw.hex()[:44]}...")
    print(f"matches the EIP : {raw == EIP155_SIGNED}")
    print(f"transaction hash: {transaction_hash(raw).hex()}")
    print(f"v {EIP155_V} encodes chain {chain_id_from_v(EIP155_V)}")

    print()
    print("The same transfer, signed for a different network")
    print("-" * 62)
    other = signing_hash(legacy_signing_bytes(EIP155_TX, SEPOLIA_CHAIN_ID))
    print(f"chain 1         : {digest.hex()}")
    print(f"chain {SEPOLIA_CHAIN_ID}  : {other.hex()}")
    differing = sum(bin(a ^ b).count("1") for a, b in zip(digest, other))
    print(f"bits differing  : {differing} of 256")

    print()
    print("Legacy and typed encodings compared")
    print("-" * 62)
    typed = FeeMarketTransaction(
        chain_id=1, nonce=9,
        max_priority_fee_per_gas=2 * WEI_PER_GWEI,
        max_fee_per_gas=20 * WEI_PER_GWEI,
        gas_limit=21000, to=EIP155_TX.to, value=EIP155_TX.value,
    )
    typed_bytes = fee_market_signing_bytes(typed)
    print(f"legacy first byte: 0x{signing[0]:02x} (an RLP list prefix)")
    print(f"typed first byte : 0x{typed_bytes[0]:02x} (the transaction type)")

    print()
    print("One wei changes the transaction hash")
    print("-" * 62)
    altered = LegacyTransaction(
        nonce=EIP155_TX.nonce, gas_price=EIP155_TX.gas_price,
        gas_limit=EIP155_TX.gas_limit, to=EIP155_TX.to,
        value=EIP155_TX.value + 1, data=EIP155_TX.data,
    )
    altered_raw = signed_legacy_bytes(altered, EIP155_V, EIP155_R, EIP155_S)
    print(f"1.000000000000000000 ETH: {transaction_hash(raw).hex()}")
    print(f"1.000000000000000001 ETH: {transaction_hash(altered_raw).hex()}")


if __name__ == "__main__":
    main()
