"""Command line for the Part III block-execution laboratory.

Usage:
    python3 block_demo.py accounts
    python3 block_demo.py recover
    python3 block_demo.py block
    python3 block_demo.py failures
    python3 block_demo.py agree
"""

from __future__ import annotations

import sys

from execution import (
    INTRINSIC_GAS,
    Transaction,
    TransactionRejected,
    WorldState,
    address_of_key,
    apply_block,
    apply_transaction,
    sender_of,
    sign_transaction,
)

ALICE = 0x1111111111111111111111111111111111111111111111111111111111111111
BOB = 0x2222222222222222222222222222222222222222222222222222222222222222
CAROL = 0x3333333333333333333333333333333333333333333333333333333333333333
COINBASE = bytes(range(20))

GWEI = 10**9
ETHER = 10**18
STARTING_BALANCE = 10 * ETHER


def opening_state() -> WorldState:
    state = WorldState()
    state.credit(address_of_key(ALICE), STARTING_BALANCE)
    return state


def transfer(nonce: int, value: int, key: int, to: int) -> Transaction:
    return sign_transaction(
        Transaction(to=address_of_key(to), value=value, nonce=nonce, gas_price=GWEI), key
    )


def canonical_block() -> list[Transaction]:
    """Alice pays Bob, Alice pays Carol, then Bob pays Carol from what he got."""
    return [
        transfer(0, 2 * ETHER, ALICE, BOB),
        transfer(1, 1 * ETHER, ALICE, CAROL),
        transfer(0, ETHER // 2, BOB, CAROL),
    ]


def eth(wei: int) -> str:
    return f"{wei / ETHER:.9f} ETH"


def show_accounts() -> None:
    for name, key in (("alice", ALICE), ("bob", BOB), ("carol", CAROL)):
        print(f"{name:6} 0x{address_of_key(key).hex()}")
    print(f"{'miner':6} 0x{COINBASE.hex()}")
    print()
    print("An address is the last 20 bytes of the Keccak-256 hash of the")
    print("public key. Nothing registers it; it exists as soon as it is derived.")


def show_recover() -> None:
    signed = transfer(0, 2 * ETHER, ALICE, BOB)
    assert signed.signature is not None
    print(f"transaction hash : {signed.hash().hex()}")
    print(f"signature r      : {signed.signature.r:064x}")
    print(f"signature s      : {signed.signature.s:064x}")
    print(f"recovery id      : {signed.signature.recovery_id}")
    print()
    print(f"recovered sender : 0x{sender_of(signed).hex()}")
    print(f"alice's address  : 0x{address_of_key(ALICE).hex()}")
    print(f"they match       : {sender_of(signed) == address_of_key(ALICE)}")
    print()
    print("The transaction carries no 'from' field. The sender is not claimed,")
    print("it is computed. Now change one signed field and recover again:")
    tampered = Transaction(
        to=signed.to,
        value=signed.value + 1,
        nonce=signed.nonce,
        gas_price=signed.gas_price,
        gas_limit=signed.gas_limit,
        signature=signed.signature,
    )
    print(f"after altering the value, sender is 0x{sender_of(tampered).hex()}")
    print("which is a different address, with no balance and no history.")


def show_block() -> None:
    state = opening_state()
    print(f"opening state root : {state.root().hex()}")
    print(f"alice              : {eth(state.balance_of(address_of_key(ALICE)))}")
    print()

    receipts, root = apply_block(state, canonical_block(), COINBASE)
    for index, receipt in enumerate(receipts):
        status = "success" if receipt.succeeded else f"failed ({receipt.reason})"
        print(
            f"tx {index}  sender 0x{receipt.sender.hex()[:8]}...  "
            f"gas {receipt.gas_used}  fee {eth(receipt.fee_paid)}  {status}"
        )

    print()
    print(f"closing state root : {root.hex()}")
    for name, key in (("alice", ALICE), ("bob", BOB), ("carol", CAROL)):
        address = address_of_key(key)
        print(
            f"{name:6} {eth(state.balance_of(address))}  nonce {state.nonce_of(address)}"
        )
    print(f"miner  {eth(state.balance_of(COINBASE))}")

    total = sum(account.balance for account in state.accounts.values())
    print()
    print(f"total across all accounts : {eth(total)}")
    print(f"equals the opening supply : {total == STARTING_BALANCE}")
    print("No ether was created or destroyed. The fees moved to the miner.")


def show_failures() -> None:
    state = opening_state()
    print("Three things that go wrong, and how differently they go wrong.\n")

    print("1. A transfer larger than the balance.")
    receipts, _ = apply_block(
        state, [transfer(0, 1000 * ETHER, ALICE, BOB)], COINBASE
    )
    receipt = receipts[0]
    print(f"   included: yes    succeeded: {receipt.succeeded}  ({receipt.reason})")
    print(f"   fee still paid: {eth(receipt.fee_paid)}")
    print(f"   alice's nonce advanced to {state.nonce_of(address_of_key(ALICE))}")
    print("   The block includes it. The sender pays for the work of finding out.\n")

    print("2. The same transaction replayed.")
    replay_state = opening_state()
    once = transfer(0, ETHER, ALICE, BOB)
    apply_transaction(replay_state, once, COINBASE)
    try:
        apply_transaction(replay_state, once, COINBASE)
    except TransactionRejected as error:
        print(f"   rejected: {error}")
    print("   The nonce has moved on, so the signature is no longer usable.\n")

    print("3. A sender with no ether at all.")
    empty = WorldState()
    try:
        apply_transaction(empty, transfer(0, 1, CAROL, BOB), COINBASE)
    except TransactionRejected as error:
        print(f"   rejected: {error}")
    print("   Not included at any price: it cannot pay for its own execution.")


def show_agree() -> None:
    block = canonical_block()
    first, second = opening_state(), opening_state()
    _, root_a = apply_block(first, block, COINBASE)
    _, root_b = apply_block(second, list(block), COINBASE)
    print(f"node A root : {root_a.hex()}")
    print(f"node B root : {root_b.hex()}")
    print(f"they agree  : {root_a == root_b}")
    print()
    print("Now node C applies the same transfers in a different order:")
    third = opening_state()
    reordered = [block[2], block[0], block[1]]
    try:
        apply_block(third, reordered, COINBASE)
    except TransactionRejected as error:
        print(f"   rejected: {error}")
    print()
    print("Bob's payment to Carol spends what Alice's payment delivered. Move it")
    print("first and it is not includable, because ordering is part of the state,")
    print("not a presentational detail of the block.")


COMMANDS = {
    "accounts": show_accounts,
    "recover": show_recover,
    "block": show_block,
    "failures": show_failures,
    "agree": show_agree,
}


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print(__doc__)
        return 1
    COMMANDS[argv[1]]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
