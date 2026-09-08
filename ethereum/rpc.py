"""JSON-RPC encoding: the hex conventions that requests and responses obey.

Companion to Chapter 13. The Ethereum JSON-RPC interface passes two kinds of
value over JSON, and encodes them by different rules. Getting the difference
wrong is a common and quiet source of bugs, because a malformed value often
looks reasonable to a human and is rejected -- or worse, misread -- by a node.

This module implements those rules and nothing else. It builds request
objects and reads responses; it does not send anything, and there is no
network access here. Issuing real requests against a live network belongs to
the Part IV lab, where a node endpoint and a test account are actually in
hand.

Verified against:
  * the encoding rules and their published WRONG examples in the official
    JSON-RPC documentation;
  * real responses recorded from three live networks on 2026-09-06, kept
    below as frozen fixtures.

Sources:
  https://ethereum.org/en/developers/docs/apis/json-rpc/
  https://github.com/ethereum/execution-apis
  EIP-695 https://eips.ethereum.org/EIPS/eip-695   (eth_chainId)
"""

from __future__ import annotations

from dataclasses import dataclass, field

JSONRPC_VERSION = "2.0"

# Block tags accepted wherever a block parameter is taken. The last two are
# the fork-choice states of Chapter 10 surfacing in the API.
BLOCK_TAGS = ("earliest", "latest", "safe", "finalized", "pending")


# --------------------------------------------------------------------------
# Quantities
#
# A quantity is a number. It is hex, "0x"-prefixed, in its most compact form:
# no leading zeros, and zero is "0x0" rather than "0x".
# --------------------------------------------------------------------------


def encode_quantity(value: int) -> str:
    """Encode a non-negative integer as a JSON-RPC QUANTITY."""
    if value < 0:
        raise ValueError("quantities are non-negative")
    return hex(value)


def decode_quantity(text: str) -> int:
    """Decode a QUANTITY, rejecting the forms the specification calls wrong."""
    if not text.startswith("0x"):
        raise ValueError(f"quantity must be 0x-prefixed: {text!r}")
    body = text[2:]
    if body == "":
        raise ValueError("quantity needs at least one digit; zero is '0x0'")
    if len(body) > 1 and body[0] == "0":
        raise ValueError(f"quantity must not carry leading zeros: {text!r}")
    return int(body, 16)


def is_valid_quantity(text: str) -> bool:
    try:
        decode_quantity(text)
        return True
    except ValueError:
        return False


# --------------------------------------------------------------------------
# Unformatted data
#
# Data is a byte array: hex, "0x"-prefixed, exactly two digits per byte.
# Leading zeros are meaningful, and the empty array is "0x".
# --------------------------------------------------------------------------


def encode_data(value: bytes) -> str:
    """Encode a byte array as JSON-RPC DATA."""
    return "0x" + value.hex()


def decode_data(text: str) -> bytes:
    """Decode DATA, rejecting an odd number of digits."""
    if not text.startswith("0x"):
        raise ValueError(f"data must be 0x-prefixed: {text!r}")
    body = text[2:]
    if len(body) % 2:
        raise ValueError(f"data needs two digits per byte: {text!r}")
    return bytes.fromhex(body)


def is_valid_data(text: str) -> bool:
    try:
        decode_data(text)
        return True
    except ValueError:
        return False


# --------------------------------------------------------------------------
# Requests and responses
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Request:
    """One JSON-RPC call. ``id`` is the caller's, and comes back unchanged."""

    method: str
    params: list = field(default_factory=list)
    id: int = 1

    def __post_init__(self) -> None:
        # Copy the caller's list. Without this the request would change
        # underneath itself whenever the caller reused or mutated the list
        # it passed in -- a defect the tests caught.
        object.__setattr__(self, "params", list(self.params))

    def as_object(self) -> dict:
        return {"jsonrpc": JSONRPC_VERSION, "method": self.method,
                "params": list(self.params), "id": self.id}


def block_parameter(block) -> str:
    """Render a block parameter: a tag, or a block number as a quantity."""
    if isinstance(block, str):
        if block not in BLOCK_TAGS:
            raise ValueError(f"unknown block tag {block!r}; expected one of "
                             f"{', '.join(BLOCK_TAGS)}")
        return block
    return encode_quantity(block)


def get_balance(address: str, block="latest") -> Request:
    """Build an eth_getBalance call. The result is a quantity, in wei."""
    return Request("eth_getBalance", [address, block_parameter(block)])


def get_block_by_number(block="latest", full_transactions: bool = False) -> Request:
    return Request("eth_getBlockByNumber",
                   [block_parameter(block), full_transactions])


def chain_id() -> Request:
    """Build an eth_chainId call, the method of EIP-695."""
    return Request("eth_chainId", [])


class RpcError(Exception):
    """An error object returned in place of a result."""

    def __init__(self, code: int, message: str):
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message


def read_response(response: dict, request_id: int | None = None):
    """Return a response's result, or raise if it carried an error.

    A JSON-RPC error is a successful HTTP exchange carrying an error object.
    Code alone cannot tell the two apart, which is why an unchecked client
    silently treats a failure as an absent result.
    """
    if "error" in response:
        err = response["error"]
        raise RpcError(err.get("code", 0), err.get("message", ""))
    if "result" not in response:
        raise ValueError("response carries neither result nor error")
    if request_id is not None and response.get("id") != request_id:
        raise ValueError(
            f"response id {response.get('id')!r} does not match request "
            f"{request_id!r}")
    return response["result"]


# --------------------------------------------------------------------------
# Fixtures recorded from live networks on 2026-09-06
# --------------------------------------------------------------------------

# eth_chainId, as returned by each network. The chain identifier is what
# EIP-155 binds a signature to, so this is the value that decides whether a
# signed transaction belongs here at all.
CHAIN_ID_RESPONSES = {
    "mainnet": ("0x1", 1),
    "sepolia": ("0xaa36a7", 11_155_111),
    "hoodi": ("0x88bb0", 560_048),
}

# Mainnet head, safe, and finalized block numbers read in one pass. The gap
# between them is the finality lag of Chapter 10, visible through the API.
BLOCK_TAG_OBSERVATION = {
    "latest": 25_919_007,
    "safe": 25_918_963,
    "finalized": 25_918_931,
}

SLOTS_PER_EPOCH = 32


def main() -> None:
    print("Quantities and data are encoded by different rules")
    print("-" * 68)
    print(f"  quantity 0     -> {encode_quantity(0):>10}   "
          f"data b''       -> {encode_data(b''):>10}")
    print(f"  quantity 65    -> {encode_quantity(65):>10}   "
          f"data b'A'      -> {encode_data(b'A'):>10}")
    print(f"  quantity 1024  -> {encode_quantity(1024):>10}   "
          f"data 3 bytes   -> {encode_data(bytes([0,0x42,0])):>10}")
    print("  the same text can be a valid quantity and invalid data, or the reverse")

    print()
    print("The forms the specification calls wrong")
    print("-" * 68)
    for text in ("0x", "0x0400", "ff", "0x0"):
        print(f"  as a quantity {text:>8}: "
              f"{'accepted' if is_valid_quantity(text) else 'rejected'}")
    for text in ("0xf0f0f", "004200", "0x", "0x004200"):
        print(f"  as data       {text:>8}: "
              f"{'accepted' if is_valid_data(text) else 'rejected'}")

    print()
    print("Why leading zeros matter in one and not the other")
    print("-" * 68)
    print(f"  data '0x004200' is {len(decode_data('0x004200'))} bytes: "
          f"{list(decode_data('0x004200'))}")
    print("  the same digits as a quantity would be rejected: the zeros are")
    print("  significant in a byte array and forbidden in a number")

    print()
    print("Chain identifiers, as three live networks reported them")
    print("-" * 68)
    for name, (raw, value) in CHAIN_ID_RESPONSES.items():
        print(f"  {name:<8} {raw:>10}  = {value:>9,}  "
              f"(decoded {'OK' if decode_quantity(raw) == value else 'BAD'})")

    print()
    print("Block tags: the fork choice, seen through the API")
    print("-" * 68)
    o = BLOCK_TAG_OBSERVATION
    for tag in ("latest", "safe", "finalized"):
        print(f"  {tag:<10} {o[tag]:,}")
    lag = o["latest"] - o["finalized"]
    print(f"  head is {lag} blocks ahead of finalized, about "
          f"{lag / SLOTS_PER_EPOCH:.1f} epochs")
    print("  which is the two-epoch finality delay of the consensus chapter")

    print()
    print("A request is an object, not a string")
    print("-" * 68)
    for r in (chain_id(),
              get_balance("0x" + "00" * 19 + "a1"),
              get_block_by_number("finalized")):
        print(f"  {r.as_object()}")

    print()
    print("An error is a successful exchange carrying an error")
    print("-" * 68)
    try:
        read_response({"jsonrpc": "2.0", "id": 1,
                       "error": {"code": -32602, "message": "invalid argument"}})
    except RpcError as exc:
        print(f"  raised: {exc}")
    print(f"  a result reads back plainly: "
          f"{read_response({'jsonrpc': '2.0', 'id': 1, 'result': '0x1'})!r}")


if __name__ == "__main__":
    main()
