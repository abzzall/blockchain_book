"""Tests for the Part III block-execution laboratory."""

import unittest

from execution import (
    INTRINSIC_GAS,
    N,
    Account,
    Transaction,
    TransactionRejected,
    WorldState,
    address_of_key,
    apply_block,
    apply_transaction,
    public_key,
    recover_public_key,
    sender_of,
    sign_transaction,
)
from keccak import keccak256

ALICE = 0x1111111111111111111111111111111111111111111111111111111111111111
BOB = 0x2222222222222222222222222222222222222222222222222222222222222222
CAROL = 0x3333333333333333333333333333333333333333333333333333333333333333
COINBASE = bytes(range(20))
GWEI = 10**9
ETHER = 10**18


def funded_state() -> WorldState:
    state = WorldState()
    state.credit(address_of_key(ALICE), ETHER)
    return state


def transfer(nonce: int, value: int, key: int = ALICE, to: int = BOB) -> Transaction:
    return sign_transaction(
        Transaction(to=address_of_key(to), value=value, nonce=nonce, gas_price=GWEI), key
    )


class KeccakTests(unittest.TestCase):
    def test_keccak_matches_published_vectors(self):
        self.assertEqual(
            keccak256(b"").hex(),
            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
        )

    def test_the_erc20_transfer_selector_comes_out_right(self):
        self.assertEqual(keccak256(b"transfer(address,uint256)")[:4].hex(), "a9059cbb")


class AddressTests(unittest.TestCase):
    def test_an_address_is_twenty_bytes(self):
        self.assertEqual(len(address_of_key(ALICE)), 20)

    def test_different_keys_give_different_addresses(self):
        self.assertNotEqual(address_of_key(ALICE), address_of_key(BOB))

    def test_a_key_outside_the_valid_range_is_rejected(self):
        for bad in (0, N, -1):
            with self.assertRaises(ValueError):
                public_key(bad)


class SenderRecoveryTests(unittest.TestCase):
    def test_the_sender_is_recovered_from_the_signature(self):
        self.assertEqual(sender_of(transfer(0, ETHER // 10)), address_of_key(ALICE))

    def test_an_unsigned_transaction_has_no_sender(self):
        with self.assertRaises(ValueError):
            sender_of(Transaction(to=address_of_key(BOB), value=1, nonce=0, gas_price=GWEI))

    def test_altering_a_signed_field_changes_the_recovered_sender(self):
        signed = transfer(0, ETHER // 10)
        tampered = Transaction(
            to=signed.to,
            value=signed.value + 1,
            nonce=signed.nonce,
            gas_price=signed.gas_price,
            gas_limit=signed.gas_limit,
            signature=signed.signature,
        )
        self.assertNotEqual(sender_of(tampered), address_of_key(ALICE))

    def test_recovery_rejects_a_malformed_signature(self):
        signed = transfer(0, 1)
        assert signed.signature is not None
        broken = type(signed.signature)(0, signed.signature.s, 0)
        with self.assertRaises(ValueError):
            recover_public_key(signed.hash(), broken)


class ExecutionTests(unittest.TestCase):
    def test_a_transfer_moves_value_and_pays_a_fee(self):
        state = funded_state()
        receipts, _ = apply_block(state, [transfer(0, ETHER // 10)], COINBASE)
        self.assertTrue(receipts[0].succeeded)
        self.assertEqual(receipts[0].gas_used, INTRINSIC_GAS)
        self.assertEqual(state.balance_of(address_of_key(BOB)), ETHER // 10)
        self.assertEqual(state.balance_of(COINBASE), INTRINSIC_GAS * GWEI)

    def test_value_is_conserved_once_the_fee_is_counted(self):
        state = funded_state()
        apply_block(state, [transfer(0, ETHER // 10)], COINBASE)
        total = sum(account.balance for account in state.accounts.values())
        self.assertEqual(total, ETHER)

    def test_the_nonce_increments_once_per_included_transaction(self):
        state = funded_state()
        apply_block(state, [transfer(0, 1), transfer(1, 1), transfer(2, 1)], COINBASE)
        self.assertEqual(state.nonce_of(address_of_key(ALICE)), 3)

    def test_a_replayed_transaction_is_rejected(self):
        state = funded_state()
        replayed = transfer(0, 1)
        apply_transaction(state, replayed, COINBASE)
        with self.assertRaises(TransactionRejected):
            apply_transaction(state, replayed, COINBASE)

    def test_an_out_of_order_nonce_is_rejected(self):
        state = funded_state()
        with self.assertRaises(TransactionRejected):
            apply_transaction(state, transfer(5, 1), COINBASE)

    def test_a_sender_who_cannot_pay_gas_is_not_includable(self):
        state = WorldState()
        state.credit(address_of_key(ALICE), 1)
        with self.assertRaises(TransactionRejected):
            apply_transaction(state, transfer(0, 1), COINBASE)

    def test_an_unaffordable_transfer_still_costs_the_sender_its_gas(self):
        state = funded_state()
        receipts, _ = apply_block(state, [transfer(0, 100 * ETHER)], COINBASE)
        self.assertFalse(receipts[0].succeeded)
        self.assertEqual(receipts[0].reason, "insufficient balance")
        self.assertEqual(receipts[0].fee_paid, INTRINSIC_GAS * GWEI)
        self.assertEqual(state.balance_of(address_of_key(BOB)), 0)
        self.assertEqual(state.nonce_of(address_of_key(ALICE)), 1)


class StateRootTests(unittest.TestCase):
    def test_two_nodes_applying_the_same_block_agree(self):
        block = [transfer(0, ETHER // 10), transfer(1, ETHER // 20)]
        first = funded_state()
        second = funded_state()
        _, root_a = apply_block(first, block, COINBASE)
        _, root_b = apply_block(second, block, COINBASE)
        self.assertEqual(root_a, root_b)

    def test_order_decides_whether_a_dependent_transfer_is_includable(self):
        # Two transfers where the second spends what the first delivered.
        # Applied in order they both succeed; reversed, the second sender
        # cannot even pay its gas, so the block is not includable at all.
        fund_bob = transfer(0, ETHER // 2, key=ALICE, to=BOB)
        bob_pays_carol = sign_transaction(
            Transaction(
                to=address_of_key(CAROL), value=ETHER // 4, nonce=0, gas_price=GWEI
            ),
            BOB,
        )

        forward = funded_state()
        receipts, root_forward = apply_block(
            forward, [fund_bob, bob_pays_carol], COINBASE
        )
        self.assertTrue(all(receipt.succeeded for receipt in receipts))
        self.assertEqual(forward.balance_of(address_of_key(CAROL)), ETHER // 4)

        backward = funded_state()
        with self.assertRaises(TransactionRejected):
            apply_block(backward, [bob_pays_carol, fund_bob], COINBASE)

        # And the successful ordering commits to a root the empty one does not.
        self.assertNotEqual(root_forward, funded_state().root())

    def test_any_change_to_any_account_changes_the_root(self):
        state = funded_state()
        before = state.root()
        state.credit(address_of_key(BOB), 1)
        self.assertNotEqual(state.root(), before)

    def test_the_root_does_not_depend_on_insertion_order(self):
        first = WorldState({address_of_key(ALICE): Account(5, 1), COINBASE: Account(2, 0)})
        second = WorldState({COINBASE: Account(2, 0), address_of_key(ALICE): Account(5, 1)})
        self.assertEqual(first.root(), second.root())


if __name__ == "__main__":
    unittest.main()
