"""Tests for contracts.py.

The ABI tests use the worked example printed in the Solidity documentation's
ABI specification. The disassembler is run on the runtime bytecode of a
contract deployed on mainnet, read once with eth_getCode; its opcode table
comes from the execution specifications.
"""

import unittest

from contracts import (
    ABI_EXAMPLE_CALL, ABI_EXAMPLE_SELECTOR, ABI_EXAMPLE_SIGNATURE,
    DEPLOYMENT_PROXY_CODE, OPCODES, SELECTOR_BYTES, WELL_KNOWN_SELECTORS,
    WORD_BYTES,
    arguments_of_call, disassemble, encode_address, encode_bool, encode_call,
    encode_uint, function_selector, function_signature, jump_destinations,
    looks_like_jumpdest_byte, selector_of_call,
)


class TestPublishedAbiExample(unittest.TestCase):
    """Every expected value is printed in the Solidity ABI specification."""

    def test_selector_matches(self):
        self.assertEqual(function_selector(ABI_EXAMPLE_SIGNATURE),
                         ABI_EXAMPLE_SELECTOR)

    def test_full_call_matches(self):
        self.assertEqual(encode_call("baz", ["uint32", "bool"], [69, True]),
                         ABI_EXAMPLE_CALL)

    def test_call_is_a_selector_plus_whole_words(self):
        self.assertEqual(len(ABI_EXAMPLE_CALL),
                         SELECTOR_BYTES + 2 * WORD_BYTES)


class TestSignatures(unittest.TestCase):
    def test_canonical_form_has_no_spaces(self):
        self.assertEqual(function_signature("baz", ["uint32", "bool"]),
                         "baz(uint32,bool)")

    def test_no_arguments(self):
        self.assertEqual(function_signature("total", []), "total()")

    def test_well_known_selectors(self):
        for sig, expected in WELL_KNOWN_SELECTORS.items():
            with self.subTest(sig=sig):
                self.assertEqual(function_selector(sig).hex(), expected)

    def test_a_different_signature_gives_a_different_selector(self):
        self.assertNotEqual(function_selector("transfer(address,uint256)"),
                            function_selector("transfer(address,uint128)"))

    def test_selector_is_four_bytes(self):
        self.assertEqual(len(function_selector("f()")), 4)


class TestArgumentEncoding(unittest.TestCase):
    def test_every_value_occupies_one_word(self):
        for kind, value in [("uint32", 69), ("bool", True), ("uint256", 2**255)]:
            with self.subTest(kind=kind):
                body = encode_call("f", [kind], [value])[SELECTOR_BYTES:]
                self.assertEqual(len(body), WORD_BYTES)

    def test_bool_is_a_full_word(self):
        self.assertEqual(encode_bool(True), b"\x00" * 31 + b"\x01")
        self.assertEqual(encode_bool(False), b"\x00" * 32)

    def test_address_is_right_aligned(self):
        addr = bytes(range(20))
        enc = encode_address(addr)
        self.assertEqual(len(enc), WORD_BYTES)
        self.assertEqual(enc[:12], b"\x00" * 12)
        self.assertEqual(enc[12:], addr)

    def test_a_bad_address_length_is_rejected(self):
        with self.assertRaises(ValueError):
            encode_address(b"\x01" * 19)

    def test_negative_uint_rejected(self):
        with self.assertRaises(ValueError):
            encode_uint(-1)

    def test_mismatched_arity_rejected(self):
        with self.assertRaises(ValueError):
            encode_call("f", ["uint256"], [1, 2])

    def test_unsupported_type_rejected(self):
        with self.assertRaises(ValueError):
            encode_call("f", ["bytes"], [b""])

    def test_call_splits_back_into_selector_and_words(self):
        call = encode_call("baz", ["uint32", "bool"], [69, True])
        self.assertEqual(selector_of_call(call), ABI_EXAMPLE_SELECTOR)
        words = arguments_of_call(call)
        self.assertEqual(len(words), 2)
        self.assertEqual(int.from_bytes(words[0], "big"), 69)
        self.assertEqual(int.from_bytes(words[1], "big"), 1)

    def test_a_ragged_argument_area_is_rejected(self):
        with self.assertRaises(ValueError):
            arguments_of_call(b"\x00" * 4 + b"\x01" * 31)

    def test_data_shorter_than_a_selector_is_rejected(self):
        with self.assertRaises(ValueError):
            selector_of_call(b"\x01\x02")


class TestOpcodeTable(unittest.TestCase):
    def test_values_from_the_execution_specifications(self):
        for name, value in [("STOP", 0x00), ("ADD", 0x01), ("CALLDATALOAD", 0x35),
                            ("MLOAD", 0x51), ("MSTORE", 0x52), ("SLOAD", 0x54),
                            ("SSTORE", 0x55), ("JUMP", 0x56), ("JUMPI", 0x57),
                            ("JUMPDEST", 0x5B), ("CREATE", 0xF0),
                            ("CREATE2", 0xF5), ("RETURN", 0xF3),
                            ("REVERT", 0xFD), ("SELFDESTRUCT", 0xFF)]:
            with self.subTest(name=name):
                self.assertEqual(OPCODES[value], name)

    def test_push_family_is_contiguous(self):
        self.assertEqual(OPCODES[0x5F], "PUSH0")
        self.assertEqual(OPCODES[0x60], "PUSH1")
        self.assertEqual(OPCODES[0x7F], "PUSH32")

    def test_dup_and_swap_families(self):
        self.assertEqual(OPCODES[0x80], "DUP1")
        self.assertEqual(OPCODES[0x8F], "DUP16")
        self.assertEqual(OPCODES[0x90], "SWAP1")
        self.assertEqual(OPCODES[0x9F], "SWAP16")


class TestDisassemblyOfARealContract(unittest.TestCase):
    def setUp(self):
        self.code = DEPLOYMENT_PROXY_CODE
        self.ins = disassemble(self.code)

    def test_the_contract_is_69_bytes(self):
        self.assertEqual(len(self.code), 69)

    def test_nothing_is_unrecognised(self):
        for i in self.ins:
            self.assertFalse(i.name.startswith("UNKNOWN"), i.name)

    def test_offsets_cover_the_code_exactly(self):
        last = self.ins[-1]
        width = 1 + len(last.immediate)
        self.assertEqual(last.offset + width, len(self.code))

    def test_it_begins_with_a_push32(self):
        self.assertEqual(self.ins[0].name, "PUSH32")
        self.assertEqual(len(self.ins[0].immediate), 32)

    def test_it_reads_its_call_data(self):
        names = {i.name for i in self.ins}
        self.assertIn("CALLDATACOPY", names)
        self.assertIn("CALLDATALOAD", names)

    def test_it_creates_a_contract_and_can_revert(self):
        names = {i.name for i in self.ins}
        self.assertIn("CREATE2", names)
        self.assertIn("REVERT", names)

    def test_it_ends_by_returning(self):
        self.assertEqual(self.ins[-1].name, "RETURN")

    def test_it_returns_twenty_bytes(self):
        """PUSH1 0x14 is 20: the length of the address it hands back."""
        pushes = [int.from_bytes(i.immediate, "big")
                  for i in self.ins if i.name == "PUSH1"]
        self.assertIn(20, pushes)


class TestJumpDestinations(unittest.TestCase):
    def test_a_push_immediate_is_not_a_jump_destination(self):
        trap = bytes.fromhex("605b00")          # PUSH1 0x5b ; STOP
        self.assertEqual(looks_like_jumpdest_byte(trap), [1])
        self.assertEqual(jump_destinations(trap), set())

    def test_a_real_jumpdest_is_found(self):
        self.assertEqual(jump_destinations(bytes.fromhex("5b00")), {0})

    def test_the_real_contract_has_one_jumpdest(self):
        self.assertEqual(jump_destinations(DEPLOYMENT_PROXY_CODE), {57})

    def test_disassembly_skips_immediate_bytes(self):
        offsets = [i.offset for i in disassemble(bytes.fromhex("605b00"))]
        self.assertEqual(offsets, [0, 2])


if __name__ == "__main__":
    unittest.main()
