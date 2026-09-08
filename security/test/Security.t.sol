// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {VulnerableVault, SafeVault, Reenterer, SafeReenterer} from "../src/Reentrancy.sol";
import {OriginAuthorised, Lure, Proxy, Logic} from "../src/AccessAndDelegate.sol";

interface Vm { function deal(address, uint256) external; function prank(address) external; }

contract SecurityTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    receive() external payable {}

    /// The attacker deposits 1 ether into a vault holding 5, and leaves with
    /// more than it put in. Nothing was broken; the order of two lines was
    /// wrong.
    function test_ReentrancyDrainsMoreThanWasDeposited() public {
        VulnerableVault v = new VulnerableVault();

        // Other users' funds.
        vm.deal(address(this), 100 ether);
        v.deposit{value: 5 ether}();

        // The attacker starts with nothing of its own; the 1 ether it
        // deposits is supplied by this call.
        Reenterer a = new Reenterer(v);
        a.attack{value: 1 ether}();

        require(address(a).balance == 6 ether, "1 in, 6 out");
        require(address(v).balance == 0, "the vault is empty");
    }

    /// The same attack against the corrected order takes nothing extra.
    function test_ChecksEffectsInteractionsStopsIt() public {
        SafeVault v = new SafeVault();

        // Somebody else's funds, deposited by a different account.
        address victim = address(0x1234);
        vm.deal(victim, 5 ether);
        vm.prank(victim);
        v.deposit{value: 5 ether}();

        // The attacker deposits 1 and withdraws. With the order corrected,
        // a re-entrant call sees a zero balance, so only the 1 comes back.
        SafeReenterer a = new SafeReenterer(v);
        a.attack{value: 1 ether}();   // funded by this test, not pre-loaded

        require(address(a).balance == 1 ether, "attacker got exactly its deposit");
        require(address(v).balance == 5 ether, "the victim's funds are untouched");
    }

    /// tx.origin is the transaction's originator, so a contract the owner
    /// calls passes the check.
    function test_TxOriginAuthorisationIsBypassable() public {
        OriginAuthorised t = new OriginAuthorised();
        Lure lure = new Lure(t);
        require(t.owner() == tx.origin, "owned by the originating account");
        require(t.treasure() == 100, "starts funded");

        // The owner is persuaded to call the lure, which calls the target.
        // The immediate caller is the lure, but tx.origin is still the
        // owner, so the check passes and the lure names itself recipient.
        lure.claimYourPrize();
        require(t.treasure() == 0, "the lure drained it");
        require(t.paidTo() == address(lure), "paid to the lure, not the owner");
    }

    /// delegatecall runs the callee's code against the caller's storage.
    /// Slot 0 of the logic contract is a number; slot 0 of the proxy is its
    /// owner.
    function test_DelegatecallOverwritesTheProxyOwner() public {
        Logic logic = new Logic();
        Proxy p = new Proxy(address(logic));
        require(p.owner() == address(this), "owner at the start");

        uint256 attacker = uint256(uint160(address(0xBAD)));
        p.run(abi.encodeWithSignature("setValue(uint256)", attacker));

        require(p.owner() == address(0xBAD), "slot 0 was overwritten");
    }
}
