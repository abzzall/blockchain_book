// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Mutability, PayableVault, NoWithdrawBox, PaidGreeting} from "../src/Mutability.sol";

contract MutabilityTest {
    Mutability internal m;

    function setUp() public {
        m = new Mutability();
    }

    function test_PureFunctionWorks() public view {
        require(m.pureAdd(2, 3) == 5, "pure add wrong");
    }

    function test_ViewFunctionReadsState() public view {
        require(m.viewStored() == 5, "view read wrong");
    }

    function test_WritingChangesState() public {
        m.write(9);
        require(m.viewStored() == 9, "write did not take");
    }

    function test_PayableFunctionAcceptsValue() public {
        uint256 received = m.deposit{value: 1 ether}();
        require(received == 1 ether, "value not seen");
        require(m.balance() == 1 ether, "balance not credited");
    }

    function test_NonPayableFunctionRejectsValue() public {
        (bool ok, ) = address(m).call{value: 1 wei}(
            abi.encodeWithSignature("write(uint256)", uint256(1))
        );
        require(!ok, "non-payable function accepted value");
    }

    function test_ContextReportsTheCaller() public view {
        (address caller, uint256 blockNumber, ) = m.context();
        require(caller == address(this), "msg.sender wrong");
        require(blockNumber == block.number, "block.number wrong");
    }

    function test_PayableVaultWithdrawsItsBalance() public {
        PayableVault vault = new PayableVault();
        vault.deposit{value: 2 ether}();
        require(vault.balance() == 2 ether, "vault not funded");

        uint256 beforeBalance = address(this).balance;
        vault.withdrawAll(payable(address(this)));
        require(vault.balance() == 0, "vault still funded");
        require(address(this).balance == beforeBalance + 2 ether, "withdrawal not received");
    }

    function test_OnlyTheOwnerCanWithdraw() public {
        PayableVault vault = new PayableVault();
        vault.deposit{value: 1 ether}();
        Attacker attacker = new Attacker();

        (bool ok, ) = address(attacker).call(
            abi.encodeWithSignature("tryWithdraw(address)", address(vault))
        );
        require(!ok, "non-owner withdrew");
        require(vault.balance() == 1 ether, "balance changed");
    }

    function test_NoWithdrawBoxKeepsReceivedEther() public {
        NoWithdrawBox box_ = new NoWithdrawBox();
        box_.deposit{value: 1 ether}();
        require(box_.balance() == 1 ether, "box not funded");
    }

    function test_PaidGreetingRequiresExactPayment() public {
        PaidGreeting service = new PaidGreeting(0.1 ether);

        (bool ok, ) = address(service).call{value: 0.09 ether}(
            abi.encodeWithSignature("buyGreeting(string)", "Ada")
        );
        require(!ok, "underpaid purchase succeeded");

        string memory greeting = service.buyGreeting{value: 0.1 ether}("Ada");
        require(
            keccak256(bytes(greeting)) == keccak256(bytes("Hello, Ada")),
            "wrong greeting"
        );
        require(service.purchases() == 1, "purchase not counted");
        require(service.balance() == 0.1 ether, "payment not retained");
    }

    function test_PaidGreetingOwnerWithdrawsRevenue() public {
        PaidGreeting service = new PaidGreeting(0.2 ether);
        service.buyGreeting{value: 0.2 ether}("Grace");

        uint256 beforeBalance = address(this).balance;
        service.withdrawAll(payable(address(this)));
        require(service.balance() == 0, "service still funded");
        require(address(this).balance == beforeBalance + 0.2 ether, "revenue not withdrawn");
    }

    receive() external payable {}
}

contract Attacker {
    function tryWithdraw(PayableVault vault) external {
        vault.withdrawAll(payable(msg.sender));
    }
}
