"""Smart contracts as the EVM sees them: selectors, ABI encoding, bytecode.

Companion to Chapter 14. Two things here are real specified algorithms, and
both are checked against values published outside this file:

  * the ABI function selector and argument encoding, against the worked
    example in the Solidity documentation's ABI specification;
  * an EVM disassembler, whose opcode table is taken from the execution
    specifications and which is run on the bytecode of a contract actually
    deployed on mainnet.

There is no network access. The bytecode below was read once with
eth_getCode and is frozen, and the address it lives at was already verified
in the Chapter 9 sample by deriving it with the CREATE formula.

Sources:
  https://docs.soliditylang.org/en/v0.8.36/abi-spec.html
  https://github.com/ethereum/execution-specs  (opcode values, Osaka fork)
  EIP-1014 https://eips.ethereum.org/EIPS/eip-1014  (CREATE2)
"""

from __future__ import annotations

from dataclasses import dataclass

from keccak import keccak256

WORD_BYTES = 32
SELECTOR_BYTES = 4

# Opcode names and values as defined in the execution specifications. This is
# a working subset: enough to read ordinary contract bytecode, not the whole
# instruction set. PUSH1..PUSH32 and the DUP/SWAP families are generated
# below, since they are numbered ranges rather than individual entries.
OPCODES: dict[int, str] = {
    0x00: "STOP",
    0x01: "ADD",
    0x02: "MUL",
    0x03: "SUB",
    0x04: "DIV",
    0x10: "LT",
    0x11: "GT",
    0x14: "EQ",
    0x15: "ISZERO",
    0x16: "AND",
    0x17: "OR",
    0x19: "NOT",
    0x20: "KECCAK",
    0x30: "ADDRESS",
    0x31: "BALANCE",
    0x33: "CALLER",
    0x34: "CALLVALUE",
    0x35: "CALLDATALOAD",
    0x36: "CALLDATASIZE",
    0x37: "CALLDATACOPY",
    0x38: "CODESIZE",
    0x39: "CODECOPY",
    0x3d: "RETURNDATASIZE",
    0x3e: "RETURNDATACOPY",
    0x50: "POP",
    0x51: "MLOAD",
    0x52: "MSTORE",
    0x53: "MSTORE8",
    0x54: "SLOAD",
    0x55: "SSTORE",
    0x56: "JUMP",
    0x57: "JUMPI",
    0x58: "PC",
    0x59: "MSIZE",
    0x5a: "GAS",
    0x5b: "JUMPDEST",
    0xa0: "LOG0",
    0xa1: "LOG1",
    0xa2: "LOG2",
    0xa3: "LOG3",
    0xa4: "LOG4",
    0xf0: "CREATE",
    0xf1: "CALL",
    0xf2: "CALLCODE",
    0xf3: "RETURN",
    0xf4: "DELEGATECALL",
    0xf5: "CREATE2",
    0xfa: "STATICCALL",
    0xfd: "REVERT",
    0xff: "SELFDESTRUCT",
}
OPCODES[0x5F] = "PUSH0"
for _n in range(1, 33):
    OPCODES[0x5F + _n] = f"PUSH{_n}"
for _n in range(1, 17):
    OPCODES[0x7F + _n] = f"DUP{_n}"
    OPCODES[0x8F + _n] = f"SWAP{_n}"


# --------------------------------------------------------------------------
# The ABI: how a call names a function and carries its arguments
# --------------------------------------------------------------------------


def function_signature(name: str, parameter_types: list[str]) -> str:
    """The canonical signature: name, parenthesised types, no spaces.

    The return type is not part of it. Solidity resolves overloads without
    considering return types, so including them would make the selector
    depend on information the caller may not have.
    """
    return f"{name}({','.join(parameter_types)})"


def function_selector(signature: str) -> bytes:
    """The first four bytes of the Keccak-256 hash of the signature."""
    return keccak256(signature.encode("ascii"))[:SELECTOR_BYTES]


def encode_uint(value: int) -> bytes:
    """One 32-byte word, big-endian, left-padded with zeros."""
    if value < 0:
        raise ValueError("use encode_int for signed values")
    return value.to_bytes(WORD_BYTES, "big")


def encode_bool(value: bool) -> bytes:
    """A bool is a full word holding 0 or 1: the ABI has no small types."""
    return encode_uint(1 if value else 0)


def encode_address(address: bytes) -> bytes:
    """An address is right-aligned in a 32-byte word, padded on the left."""
    if len(address) != 20:
        raise ValueError("an address is 20 bytes")
    return bytes(WORD_BYTES - 20) + address


def encode_call(name: str, parameter_types: list[str], values: list) -> bytes:
    """Build the data field of a call: selector, then one word per argument.

    Only the fixed-size types this chapter needs are handled. Dynamic types
    such as bytes and arrays are encoded by offset rather than inline, which
    the ABI specification covers and this sample deliberately does not.
    """
    if len(parameter_types) != len(values):
        raise ValueError("one value per parameter type")
    out = function_selector(function_signature(name, parameter_types))
    for kind, value in zip(parameter_types, values):
        if kind == "bool":
            out += encode_bool(value)
        elif kind == "address":
            out += encode_address(value)
        elif kind.startswith("uint"):
            out += encode_uint(value)
        else:
            raise ValueError(f"this sample does not encode {kind!r}")
    return out


def selector_of_call(data: bytes) -> bytes:
    """The four bytes a contract reads first to decide what was asked."""
    if len(data) < SELECTOR_BYTES:
        raise ValueError("call data is shorter than a selector")
    return data[:SELECTOR_BYTES]


def arguments_of_call(data: bytes) -> list[bytes]:
    """The 32-byte words following the selector."""
    body = data[SELECTOR_BYTES:]
    if len(body) % WORD_BYTES:
        raise ValueError("argument area is not a whole number of words")
    return [body[i:i + WORD_BYTES] for i in range(0, len(body), WORD_BYTES)]


# --------------------------------------------------------------------------
# Bytecode
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Instruction:
    """One decoded instruction and its position in the code."""

    offset: int
    opcode: int
    name: str
    immediate: bytes = b""

    def __str__(self) -> str:
        if self.immediate:
            return f"{self.offset:>4}: {self.name} 0x{self.immediate.hex()}"
        return f"{self.offset:>4}: {self.name}"


def disassemble(code: bytes) -> list[Instruction]:
    """Decode bytecode into instructions.

    Only PUSH carries an immediate: its operand is the bytes that follow it
    in the code itself. Every other instruction takes its inputs from the
    stack, which is why the EVM's instruction stream is so nearly a flat list
    of one-byte opcodes.
    """
    out: list[Instruction] = []
    i = 0
    while i < len(code):
        op = code[i]
        name = OPCODES.get(op, f"UNKNOWN_{op:02x}")
        if name.startswith("PUSH") and name != "PUSH0":
            width = int(name[4:])
            immediate = code[i + 1:i + 1 + width]
            out.append(Instruction(i, op, name, immediate))
            i += 1 + width
        else:
            out.append(Instruction(i, op, name))
            i += 1
    return out


def jump_destinations(code: bytes) -> set[int]:
    """Offsets a JUMP may target.

    Only a JUMPDEST is a legal target, and a byte inside a PUSH immediate
    does not count even when its value is 0x5b. This is why jumps must be
    checked against a disassembly rather than against the raw bytes.
    """
    return {ins.offset for ins in disassemble(code) if ins.name == "JUMPDEST"}


def looks_like_jumpdest_byte(code: bytes) -> list[int]:
    """Every byte equal to 0x5b, including ones inside PUSH immediates."""
    return [i for i, b in enumerate(code) if b == 0x5B]


# --------------------------------------------------------------------------
# A real contract, read from mainnet with eth_getCode on 2026-09-06
#
# This is the deterministic deployment proxy at
# 0x4e59b44847b379578588920cA78FbF26c0B4956C, whose address the Chapter 9
# sample derives from its deployer and a nonce of zero. It is 69 bytes: it
# copies its call data into memory, uses the first word as a CREATE2 salt and
# the rest as initialisation code, reverts if creation fails, and otherwise
# returns the 20-byte address of what it made.
# --------------------------------------------------------------------------

DEPLOYMENT_PROXY_ADDRESS = "0x4e59b44847b379578588920cA78FbF26c0B4956C"
DEPLOYMENT_PROXY_CODE = bytes.fromhex(
    "7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    "e03601600081602082378035828234f58015156039578182fd5b808252505050"
    "6014600cf3"
)

# The worked example printed in the Solidity ABI specification.
ABI_EXAMPLE_SIGNATURE = "baz(uint32,bool)"
ABI_EXAMPLE_SELECTOR = bytes.fromhex("cdcd77c0")
ABI_EXAMPLE_CALL = bytes.fromhex(
    "cdcd77c0"
    "0000000000000000000000000000000000000000000000000000000000000045"
    "0000000000000000000000000000000000000000000000000000000000000001"
)

# Selectors of three widely deployed token functions, useful because they can
# be checked against any published ABI.
WELL_KNOWN_SELECTORS = {
    "transfer(address,uint256)": "a9059cbb",
    "balanceOf(address)": "70a08231",
    "approve(address,uint256)": "095ea7b3",
}


def main() -> None:
    print("The ABI example published in the Solidity specification")
    print("-" * 70)
    sel = function_selector(ABI_EXAMPLE_SIGNATURE)
    print(f"  signature : {ABI_EXAMPLE_SIGNATURE}")
    print(f"  selector  : 0x{sel.hex()}   "
          f"{'OK' if sel == ABI_EXAMPLE_SELECTOR else 'MISMATCH'}")
    call = encode_call("baz", ["uint32", "bool"], [69, True])
    print(f"  full call : 0x{call.hex()}")
    print(f"  matches the published value: {call == ABI_EXAMPLE_CALL}")
    print(f"  length    : {len(call)} bytes = 4 + {len(arguments_of_call(call))}"
          f" words of {WORD_BYTES}")

    print()
    print("Every argument occupies a whole word, whatever its type")
    print("-" * 70)
    for kind, value in [("uint32", 69), ("bool", True), ("uint256", 2**255)]:
        enc = encode_call("f", [kind], [value])[SELECTOR_BYTES:]
        print(f"  {kind:<8} -> {len(enc)} bytes: 0x{enc.hex()[:24]}...")
    print("  a uint32 and a uint256 cost the same space on the wire")

    print()
    print("Selectors of some widely deployed functions")
    print("-" * 70)
    for sig, expected in WELL_KNOWN_SELECTORS.items():
        got = function_selector(sig).hex()
        print(f"  {sig:<28} 0x{got}  {'OK' if got == expected else 'MISMATCH'}")

    print()
    print("The return type is not part of the signature")
    print("-" * 70)
    print(f"  balanceOf(address) -> 0x{function_selector('balanceOf(address)').hex()}")
    print("  a contract cannot tell from the selector what it is expected to")
    print("  return, which is why the ABI is needed to read the answer back")

    print()
    print(f"A real contract: {DEPLOYMENT_PROXY_ADDRESS}")
    print("-" * 70)
    code = DEPLOYMENT_PROXY_CODE
    print(f"  {len(code)} bytes of runtime bytecode, read with eth_getCode")
    for ins in disassemble(code):
        print(f"  {ins}")

    print()
    print("Not every 0x5b byte is a jump destination")
    print("-" * 70)
    print(f"  in the real contract, bytes equal to 0x5b : "
          f"{looks_like_jumpdest_byte(code)}")
    print(f"  and its actual JUMPDESTs                  : "
          f"{sorted(jump_destinations(code))}")
    print("  here they agree, which is the ordinary case and proves nothing.")
    print()
    trap = bytes.fromhex("605b00")   # PUSH1 0x5b ; STOP
    print(f"  now 0x{trap.hex()}, which is PUSH1 0x5b followed by STOP:")
    for ins in disassemble(trap):
        print(f"    {ins}")
    print(f"  bytes equal to 0x5b : {looks_like_jumpdest_byte(trap)}")
    print(f"  actual JUMPDESTs    : {sorted(jump_destinations(trap))}")
    print("  byte 1 is data belonging to the PUSH, not an instruction, so it")
    print("  is not a legal jump target however much it looks like one")


if __name__ == "__main__":
    main()
