// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Constants, DefaultValues} from "../src/Constants.sol";

contract ConstantsTest {
    Constants internal c;

    function setUp() public {
        c = new Constants();
    }

    function test_ConstantIsFixedAtCompileTime() public view {
        require(c.DECIMALS() == 18, "constant wrong");
    }

    function test_ConstantCanBeAHashOfALiteral() public view {
        require(
            c.NAME_HASH() == keccak256("blockchain-handbook"),
            "constant hash wrong"
        );
    }

    function test_ImmutableIsFixedAtDeployment() public view {
        require(c.deployer() == address(this), "immutable deployer wrong");
    }

    function test_ImmutableCanCaptureTheEnvironment() public view {
        require(c.createdAtBlock() == block.number, "immutable block wrong");
    }

    function test_TwoDeploymentsGetDifferentImmutables() public {
        Constants other = new Constants();
        // Same source, same constants; the immutable is set per deployment.
        require(other.DECIMALS() == c.DECIMALS(), "constants should agree");
        require(other.deployer() == address(this), "deployer wrong");
    }

    function test_AnOrdinaryStateVariableCanChange() public {
        require(c.mutableValue() == 1, "initial value wrong");
        c.setMutable(42);
        require(c.mutableValue() == 42, "state did not change");
    }

    function test_ReadingAConstantIsCheaperThanReadingStorage() public view {
        uint256 g0 = gasleft();
        c.DECIMALS();
        uint256 constantCost = g0 - gasleft();

        uint256 g1 = gasleft();
        c.mutableValue();
        uint256 storageCost = g1 - gasleft();

        require(constantCost < storageCost, "constant should be cheaper");
    }

    function test_StateVariablesReceiveTypeDefaults() public {
        DefaultValues defaults = new DefaultValues();

        require(defaults.number() == 0, "uint default wrong");
        require(defaults.flag() == false, "bool default wrong");
        require(defaults.account() == address(0), "address default wrong");
        require(defaults.digest() == bytes32(0), "bytes32 default wrong");
        require(defaults.phase() == DefaultValues.Phase.Draft, "enum default wrong");
        require(defaults.balances(address(0xBEEF)) == 0, "mapping default wrong");
    }

    function test_NamedReturnVariablesReceiveDefaults() public {
        DefaultValues defaults = new DefaultValues();
        (uint256 amount, bool ok, address recipient) = defaults.namedReturnDefaults();

        require(amount == 0, "return uint default wrong");
        require(ok == false, "return bool default wrong");
        require(recipient == address(0), "return address default wrong");
    }

    function test_LocalVariablesReceiveDefaults() public {
        DefaultValues defaults = new DefaultValues();
        (uint256 number_, bool flag_) = defaults.localDefaults();

        require(number_ == 0, "local uint default wrong");
        require(flag_ == false, "local bool default wrong");
    }
}
