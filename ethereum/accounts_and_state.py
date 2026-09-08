"""Ethereum's account model, addresses, and state transitions for Chapter 9.

These are the real specified algorithms, and the tests check each against a
value published somewhere other than this file:

  * Keccak-256 (see keccak.py), against published digest vectors;
  * RLP encoding, against the canonical cases;
  * EIP-55 checksummed addresses, against all eight vectors in that document;
  * address derivation from a public key, against a documented account whose
    public key and address are both published;
  * CREATE, against a contract deployed on mainnet;
  * CREATE2, against an EIP-1014 vector;
  * the canonical empty-code hash and empty-storage-trie root.

The world-state model is a reduced teaching version. It exists to show the
account model against Chapter 7's unspent-output model: balances that are
mutated rather than outputs that are consumed and recreated. It implements the
account fields and basic balance/nonce transitions, and omits gas accounting,
signatures, the EVM, trie updates, and EIP-7702 delegation processing. Its
tests verify that local model, not conformance to the protocol.

No network access, node, wallet, key, or funds are required.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from keccak import keccak256

WEI_PER_ETH = 10**18
WEI_PER_GWEI = 10**9

# The hash of the empty byte string. Every externally-owned account has this
# as its codeHash, which is precisely what distinguishes it from a contract.
EMPTY_CODE_HASH = keccak256(b"")


# --- RLP ---------------------------------------------------------------------

def rlp_encode(item: bytes | int | list) -> bytes:
    """Encode bytes, non-negative integers, or nested lists as RLP.

    RLP encodes *structure* only: it says how items nest and how long they are,
    and assigns no meaning to the bytes themselves. Integers are encoded as
    their shortest big-endian form, so zero is the empty string.
    """
    if isinstance(item, int):
        if item < 0:
            raise ValueError("RLP encodes non-negative integers only")
        item = item.to_bytes((item.bit_length() + 7) // 8, "big")
    if isinstance(item, bytes):
        if len(item) == 1 and item[0] < 0x80:
            return item
        return _length_prefix(len(item), 0x80) + item
    if isinstance(item, list):
        payload = b"".join(rlp_encode(x) for x in item)
        return _length_prefix(len(payload), 0xC0) + payload
    raise TypeError(f"cannot RLP-encode {type(item).__name__}")


def _length_prefix(length: int, offset: int) -> bytes:
    if length < 56:
        return bytes([offset + length])
    encoded = length.to_bytes((length.bit_length() + 7) // 8, "big")
    return bytes([offset + 55 + len(encoded)]) + encoded


# --- Addresses ---------------------------------------------------------------

def address_from_public_key(public_key: bytes) -> bytes:
    """Derive the 20-byte address from a 64-byte uncompressed public key.

    The address is the last 20 bytes of the Keccak-256 hash of the public key,
    with the 0x04 uncompressed prefix removed first. Note that an address is a
    *truncated* hash, so it commits to the key with 160 bits, not 256.
    """
    if len(public_key) == 65 and public_key[0] == 0x04:
        public_key = public_key[1:]
    if len(public_key) != 64:
        raise ValueError("expected a 64-byte uncompressed public key")
    return keccak256(public_key)[-20:]


def create_address(creator: bytes, nonce: int) -> bytes:
    """Derive a contract address for the CREATE operation.

    It is the last 20 bytes of the Keccak-256 hash of the RLP encoding of the
    creator and its nonce. Because the nonce is included, the same creator
    deploying twice gets different addresses -- and the address is known
    before the contract is deployed.
    """
    if len(creator) != 20:
        raise ValueError("creator must be a 20-byte address")
    return keccak256(rlp_encode([creator, nonce]))[-20:]


def create2_address(creator: bytes, salt: bytes, init_code: bytes) -> bytes:
    """Derive a CREATE2 address as specified by EIP-1014."""
    if len(creator) != 20:
        raise ValueError("creator must be a 20-byte address")
    if len(salt) != 32:
        raise ValueError("salt must be 32 bytes")
    return keccak256(b"\xff" + creator + salt + keccak256(init_code))[-20:]


def to_checksum_address(address: bytes) -> str:
    """Apply the EIP-55 mixed-case checksum to a 20-byte address.

    The lowercase hex string is hashed *as ASCII text*, and each hex letter is
    upper-cased where the corresponding hash nibble is 8 or above. Case
    therefore carries about 15 check bits, which catches most typing errors
    while remaining valid input for case-insensitive parsers.
    """
    if len(address) != 20:
        raise ValueError("an address is 20 bytes")
    hex_addr = address.hex()
    digest = keccak256(hex_addr.encode("ascii")).hex()
    out = "".join(
        char.upper() if char in "abcdef" and int(digest[i], 16) > 7 else char
        for i, char in enumerate(hex_addr)
    )
    return "0x" + out


def is_valid_checksum_address(text: str) -> bool:
    """Return whether a mixed-case address has a valid EIP-55 checksum."""
    return address_case_status(text) == "checksummed"


def address_case_status(text: str) -> str:
    """Classify address text as ``checksummed``, ``unchecked``, or ``invalid``.

    Uniform-case hexadecimal is widely accepted as an unchecked address. It
    conveys no checksum evidence, even in the rare case where it happens to
    equal the capitalization produced by EIP-55.
    """
    body = text[2:] if text.startswith("0x") else text
    if len(body) != 40:
        return "invalid"
    try:
        raw = bytes.fromhex(body)
    except ValueError:
        return "invalid"
    if body == body.lower() or body == body.upper():
        return "unchecked"
    return "checksummed" if to_checksum_address(raw) == "0x" + body else "invalid"


# --- Accounts and world state ------------------------------------------------

# The empty Merkle-Patricia-trie root is Keccak-256(RLP(empty byte string)).
EMPTY_STORAGE_ROOT = keccak256(rlp_encode(b""))


@dataclass
class Account:
    """The four fields every Ethereum account has."""

    nonce: int = 0
    balance: int = 0  # in wei
    code_hash: bytes = EMPTY_CODE_HASH
    storage_root: bytes = EMPTY_STORAGE_ROOT

    @property
    def has_code(self) -> bool:
        """Whether state records code for this account.

        This is deliberately not named ``is_contract``: after EIP-7702, an EOA
        may contain a delegation indicator while remaining key-controlled and
        able to originate transactions.
        """
        return self.code_hash != EMPTY_CODE_HASH


@dataclass
class WorldState:
    """A mapping from addresses to accounts.

    This is the essential contrast with Bitcoin: the record holds *accounts
    with balances* that transactions mutate, not a set of unspent outputs that
    transactions consume and recreate.
    """

    accounts: dict[bytes, Account] = field(default_factory=dict)

    def get(self, address: bytes) -> Account:
        """Read account values without creating a persistent account.

        An unused address reads like an empty account, but existence in the
        state is distinct from those default values.
        """
        return self.accounts.get(address, Account())

    def get_or_create(self, address: bytes) -> Account:
        """Return the mutable account used by a state-changing operation."""
        return self.accounts.setdefault(address, Account())

    def balance_of(self, address: bytes) -> int:
        return self.get(address).balance

    def transfer(self, sender: bytes, recipient: bytes, value: int, nonce: int) -> None:
        """Move value between accounts, enforcing the nonce rule.

        The nonce must equal the sender's current nonce. This is what makes a
        signed transaction usable exactly once: replaying it fails because the
        nonce has already advanced.
        """
        account = self.get_or_create(sender)
        if nonce != account.nonce:
            raise ValueError(
                f"wrong nonce: transaction has {nonce}, account expects {account.nonce}"
            )
        if value < 0:
            raise ValueError("value must not be negative")
        if account.balance < value:
            raise ValueError(
                f"insufficient balance: has {account.balance}, needs {value}"
            )
        account.balance -= value
        account.nonce += 1
        self.get_or_create(recipient).balance += value

    def deploy(self, sender: bytes, code: bytes) -> bytes:
        """Create a contract account at the address derived from sender and nonce."""
        account = self.get_or_create(sender)
        address = create_address(sender, account.nonce)
        account.nonce += 1
        self.accounts[address] = Account(code_hash=keccak256(code))
        return address


def format_eth(wei: int) -> str:
    """Render wei as ETH exactly, without floating-point arithmetic."""
    sign = "-" if wei < 0 else ""
    whole, frac = divmod(abs(wei), WEI_PER_ETH)
    return f"{sign}{whole}.{frac:018d}"


# --- Demonstration -----------------------------------------------------------

def main() -> None:
    print("Keccak-256 is not SHA3-256")
    import hashlib

    print(f"  keccak256('abc') {keccak256(b'abc').hex()[:40]}...")
    print(f"  sha3_256('abc')  {hashlib.sha3_256(b'abc').hexdigest()[:40]}...")
    print("  One padding byte separates them, and every digest differs.")

    print("\nDenominations")
    print(f"  1 ETH   = {WEI_PER_ETH:,} wei")
    print(f"  1 gwei  = {WEI_PER_GWEI:,} wei")
    print(f"  All protocol arithmetic is in integer wei: {format_eth(1)} ETH is one wei.")

    print("\nEIP-55 checksummed addresses")
    raw = bytes.fromhex("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")
    print(f"  lowercase  0x{raw.hex()}")
    print(f"  checksummed {to_checksum_address(raw)}")
    print(f"  status: {address_case_status(to_checksum_address(raw))}")
    mistyped = to_checksum_address(raw).replace("5aAeb", "5aAeB", 1)
    print(f"  one letter re-cased is: {address_case_status(mistyped)}")
    print(f"  lowercase form is: {address_case_status('0x' + raw.hex())}")

    print("\nAccounts versus unspent outputs")
    alice = bytes.fromhex("00" * 19 + "a1")
    bob = bytes.fromhex("00" * 19 + "b0")
    state = WorldState()
    state.get_or_create(alice).balance = 5 * WEI_PER_ETH
    print(f"  alice starts with {format_eth(state.balance_of(alice))} ETH")
    state.transfer(alice, bob, 2 * WEI_PER_ETH, nonce=0)
    print(f"  after sending 2 ETH: alice {format_eth(state.balance_of(alice))},"
          f" bob {format_eth(state.balance_of(bob))}")
    print("  One balance was decremented and another incremented.")
    print("  Nothing was consumed and recreated, and there is no change output.")

    print("\nThe nonce makes a signed transaction usable once")
    print(f"  alice's nonce is now {state.get(alice).nonce}")
    try:
        state.transfer(alice, bob, 2 * WEI_PER_ETH, nonce=0)
    except ValueError as exc:
        print(f"  replaying the same transaction fails: {exc}")

    print("\nCode presence in this reduced model")
    deployed = state.deploy(alice, b"\x60\x00\x60\x00\xf3")
    print(f"  contract deployed at 0x{deployed.hex()}")
    print(f"  deployed account has code: {state.get(deployed).has_code}")
    print(f"  alice has code: {state.get(alice).has_code}")
    print("  Non-empty code identifies code presence, not account control after EIP-7702.")

    print("\n  The address was determined before deployment:")
    predicted = create_address(alice, 1)
    print(f"  predicted for nonce 1: 0x{predicted.hex()}")
    print(f"  matches: {predicted == deployed}")


if __name__ == "__main__":
    main()
