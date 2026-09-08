"""Verification against Bitcoin's consensus serialization and the genesis block."""

import unittest

from utxo_and_script import (
    ALICE,
    BOB,
    COIN,
    COINBASE_TXID,
    COINBASE_VOUT,
    OP_CHECKSIG,
    OP_RETURN,
    OutPoint,
    ScriptError,
    Transaction,
    TxIn,
    TxOut,
    UtxoSet,
    block_header_hash,
    hash160,
    p2pkh_script_pubkey,
    p2pkh_script_sig,
    run_script,
    select_coins,
    sha256d,
    transaction_fee,
    varint,
    verify_p2pkh,
)

GENESIS_MESSAGE = (
    b"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"
)
GENESIS_PUBKEY = bytes.fromhex(
    "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb"
    "649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f"
)
GENESIS_TXID = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
GENESIS_BLOCK_HASH = (
    "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
)


def genesis_transaction() -> Transaction:
    script_sig = (
        bytes.fromhex("04ffff001d")
        + bytes([0x01, 0x04, len(GENESIS_MESSAGE)])
        + GENESIS_MESSAGE
    )
    script_pubkey = (
        bytes([len(GENESIS_PUBKEY)]) + GENESIS_PUBKEY + bytes([OP_CHECKSIG])
    )
    return Transaction(
        version=1,
        inputs=(TxIn(OutPoint(COINBASE_TXID, COINBASE_VOUT), script_sig),),
        outputs=(TxOut(50 * COIN, script_pubkey),),
    )


class GenesisSerializationTests(unittest.TestCase):
    """If the serialization is wrong by one byte, these fail."""

    def test_genesis_txid(self) -> None:
        self.assertEqual(genesis_transaction().txid(), GENESIS_TXID)

    def test_genesis_block_hash(self) -> None:
        merkle_root = sha256d(genesis_transaction().serialize())
        self.assertEqual(
            block_header_hash(
                1, b"\x00" * 32, merkle_root, 1231006505, 0x1D00FFFF, 2083236893
            ),
            GENESIS_BLOCK_HASH,
        )

    def test_genesis_is_coinbase(self) -> None:
        self.assertTrue(genesis_transaction().is_coinbase())

    def test_genesis_pays_the_initial_subsidy(self) -> None:
        self.assertEqual(genesis_transaction().outputs[0].value, 50 * COIN)


class VarintTests(unittest.TestCase):
    def test_boundaries(self) -> None:
        self.assertEqual(varint(0), b"\x00")
        self.assertEqual(varint(0xFC), b"\xfc")
        self.assertEqual(varint(0xFD), b"\xfd\xfd\x00")
        self.assertEqual(varint(0xFFFF), b"\xfd\xff\xff")
        self.assertEqual(varint(0x10000), b"\xfe\x00\x00\x01\x00")


class UtxoSetTests(unittest.TestCase):
    def setUp(self) -> None:
        self.utxos = UtxoSet()
        self.funding = Transaction(
            inputs=(TxIn(OutPoint(COINBASE_TXID, COINBASE_VOUT), b"\x01\x00"),),
            outputs=(
                TxOut(60_000_000, p2pkh_script_pubkey(ALICE)),
                TxOut(30_000_000, p2pkh_script_pubkey(ALICE)),
                TxOut(10_000_000, p2pkh_script_pubkey(BOB)),
            ),
        )
        self.utxos.add_transaction(self.funding)

    def test_outputs_become_entries(self) -> None:
        self.assertEqual(len(self.utxos.entries), 3)

    def test_balance_is_a_sum_of_separate_outputs(self) -> None:
        self.assertEqual(self.utxos.balance(p2pkh_script_pubkey(ALICE)), 90_000_000)
        self.assertEqual(len(self.utxos.spendable(p2pkh_script_pubkey(ALICE))), 2)

    def test_spending_removes_the_entry(self) -> None:
        (key, _), *_ = self.utxos.spendable(p2pkh_script_pubkey(ALICE))
        spend = Transaction(
            inputs=(TxIn(OutPoint(bytes.fromhex(key[0])[::-1], key[1])),),
            outputs=(TxOut(59_000_000, p2pkh_script_pubkey(BOB)),),
        )
        self.utxos.add_transaction(spend)
        self.assertNotIn(key, self.utxos.entries)

    def test_double_spend_is_rejected(self) -> None:
        (key, _), *_ = self.utxos.spendable(p2pkh_script_pubkey(ALICE))
        spend = Transaction(
            inputs=(TxIn(OutPoint(bytes.fromhex(key[0])[::-1], key[1])),),
            outputs=(TxOut(59_000_000, p2pkh_script_pubkey(BOB)),),
        )
        self.utxos.add_transaction(spend)
        with self.assertRaises(ValueError):
            self.utxos.add_transaction(spend)

    def test_invalid_transaction_does_not_partially_spend(self) -> None:
        (key, _), *_ = self.utxos.spendable(p2pkh_script_pubkey(ALICE))
        existing = OutPoint(bytes.fromhex(key[0])[::-1], key[1])
        missing = OutPoint(b"\x99" * 32, 0)
        bad = Transaction(
            inputs=(TxIn(existing, b""), TxIn(missing, b"")),
            outputs=(TxOut(1, b"\x51"),),
        )
        before = dict(self.utxos.entries)
        with self.assertRaises(ValueError):
            self.utxos.add_transaction(bad)
        self.assertEqual(self.utxos.entries, before)

    def test_op_return_output_is_not_added(self) -> None:
        tx = Transaction(
            inputs=(TxIn(OutPoint(COINBASE_TXID, COINBASE_VOUT), b"\x01\x00"),),
            outputs=(TxOut(0, bytes([OP_RETURN, 1, 0x42])),),
        )
        empty = UtxoSet()
        empty.add_transaction(tx)
        self.assertEqual(empty.entries, {})


class CoinSelectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.available = [
            (("a", 0), TxOut(60_000_000, p2pkh_script_pubkey(ALICE))),
            (("b", 0), TxOut(30_000_000, p2pkh_script_pubkey(ALICE))),
        ]

    def test_selection_overshoots_because_outputs_are_whole(self) -> None:
        chosen = select_coins(self.available, 50_000_000)
        total = sum(out.value for _, out in chosen)
        self.assertEqual(len(chosen), 1)
        self.assertGreater(total, 50_000_000)

    def test_selection_can_combine_outputs(self) -> None:
        chosen = select_coins(self.available, 80_000_000)
        self.assertEqual(len(chosen), 2)

    def test_insufficient_funds(self) -> None:
        with self.assertRaises(ValueError):
            select_coins(self.available, 100_000_000)


class FeeTests(unittest.TestCase):
    def test_fee_is_the_gap(self) -> None:
        tx = Transaction(outputs=(TxOut(49_998_000, p2pkh_script_pubkey(BOB)),))
        self.assertEqual(transaction_fee(50_000_000, tx), 2_000)

    def test_forgotten_change_becomes_fee(self) -> None:
        """The classic costly mistake: omitting the change output."""
        with_change = Transaction(
            outputs=(
                TxOut(50_000_000, p2pkh_script_pubkey(BOB)),
                TxOut(9_998_000, p2pkh_script_pubkey(ALICE)),
            )
        )
        without_change = Transaction(
            outputs=(TxOut(50_000_000, p2pkh_script_pubkey(BOB)),)
        )
        self.assertEqual(transaction_fee(60_000_000, with_change), 2_000)
        self.assertEqual(transaction_fee(60_000_000, without_change), 10_000_000)


class ScriptTests(unittest.TestCase):
    def setUp(self) -> None:
        self.accept = lambda sig, pub: sig == b"valid-signature"
        self.condition = p2pkh_script_pubkey(ALICE)

    def test_valid_spend(self) -> None:
        script_sig = p2pkh_script_sig(b"valid-signature", b"alice public key")
        self.assertTrue(verify_p2pkh(script_sig, self.condition, self.accept))

    def test_bad_signature_fails(self) -> None:
        script_sig = p2pkh_script_sig(b"forged", b"alice public key")
        self.assertFalse(verify_p2pkh(script_sig, self.condition, self.accept))

    def test_wrong_public_key_fails_before_signature_check(self) -> None:
        script_sig = p2pkh_script_sig(b"valid-signature", b"bob public key")
        self.assertFalse(verify_p2pkh(script_sig, self.condition, self.accept))

    def test_hash160_matches_the_condition(self) -> None:
        self.assertEqual(hash160(b"alice public key"), ALICE)

    def test_unsupported_opcode_raises(self) -> None:
        with self.assertRaises(ScriptError):
            run_script(bytes([0xFF]))

    def test_push_places_data_on_the_stack(self) -> None:
        self.assertEqual(run_script(bytes([3]) + b"abc"), [b"abc"])


if __name__ == "__main__":
    unittest.main()
