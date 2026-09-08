// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {CampusToken} from "../contracts/CampusToken.sol";
import {CampusBadge, CampusItems, RefusesTokens} from "../contracts/CampusBadge.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract TokenStandardsTest {
    // ---- ERC-20: the allowance mechanism -------------------------------

    function test_TransferMovesBalanceDirectly() public {
        CampusToken t = new CampusToken(address(this));
        t.mint(address(this), 100);
        t.transfer(address(0xB0B), 30);
        require(t.balanceOf(address(0xB0B)) == 30, "recipient balance wrong");
        require(t.balanceOf(address(this)) == 70, "sender balance wrong");
    }

    function test_SpendingMoreThanTheBalanceReverts() public {
        CampusToken t = new CampusToken(address(this));
        (bool ok, bytes memory data) = address(t).call(
            abi.encodeWithSignature("transfer(address,uint256)", address(0xB0B), 1)
        );
        require(!ok, "an empty account should not be able to transfer");
        require(
            bytes4(data) == IERC20Errors.ERC20InsufficientBalance.selector,
            "expected the ERC20InsufficientBalance error"
        );
    }

    /// approve then transferFrom: the two-step pattern that lets a contract
    /// move tokens it does not own.
    function test_ApproveThenTransferFromSpendsTheAllowance() public {
        CampusToken t = new CampusToken(address(this));
        t.mint(address(this), 100);

        Spender s = new Spender();
        t.approve(address(s), 40);
        require(t.allowance(address(this), address(s)) == 40, "allowance not set");

        s.pull(t, address(this), address(0xB0B), 25);

        require(t.balanceOf(address(0xB0B)) == 25, "tokens did not move");
        require(
            t.allowance(address(this), address(s)) == 15,
            "allowance should have been reduced by the amount spent"
        );
    }

    function test_SpendingBeyondTheAllowanceReverts() public {
        CampusToken t = new CampusToken(address(this));
        t.mint(address(this), 100);
        Spender s = new Spender();
        t.approve(address(s), 10);

        (bool ok, ) = address(s).call(
            abi.encodeWithSignature(
                "pull(address,address,address,uint256)",
                address(t), address(this), address(0xB0B), uint256(11))
        );
        require(!ok, "spending beyond the allowance should fail");
    }

    function test_AnAllowanceIsNotABalance() public {
        CampusToken t = new CampusToken(address(this));
        // No tokens were minted, yet an allowance can still be granted.
        t.approve(address(0xB0B), 1000);
        require(t.allowance(address(this), address(0xB0B)) == 1000, "allowance");
        require(t.balanceOf(address(this)) == 0, "balance should be zero");
    }

    // ---- ERC-721: ownership per identifier ------------------------------

    function test_EachIdentifierHasOneOwner() public {
        CampusBadge b = new CampusBadge(address(this));
        uint256 first = b.issue(address(this));
        uint256 second = b.issue(address(this));
        require(first == 1 && second == 2, "identifiers should increment");
        require(b.ownerOf(first) == address(this), "owner wrong");
        require(b.balanceOf(address(this)) == 2, "count of items wrong");
    }

    function test_SafeTransferChecksTheRecipientCanReceive() public {
        CampusBadge b = new CampusBadge(address(this));
        uint256 id = b.issue(address(this));
        RefusesTokens r = new RefusesTokens();

        (bool ok, ) = address(b).call(
            abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256)",
                address(this), address(r), id)
        );
        require(!ok, "a contract that cannot receive should be refused");
        require(b.ownerOf(id) == address(this), "the token should not have moved");
    }

    // ---- ERC-1155: classes with quantities ------------------------------

    function test_OneContractHoldsSeveralKindsOfThing() public {
        CampusItems i = new CampusItems(address(this));
        i.issue(address(this), i.TICKET(), 5);
        i.issue(address(this), i.DIPLOMA(), 1);
        require(i.balanceOf(address(this), i.TICKET()) == 5, "ticket count");
        require(i.balanceOf(address(this), i.DIPLOMA()) == 1, "diploma count");
    }

    // ---- ERC-165: asking a contract what it implements -------------------

    function test_InterfaceIdentifiersArePublishedConstants() public {
        CampusBadge b = new CampusBadge(address(this));
        CampusItems i = new CampusItems(address(this));

        require(b.supportsInterface(0x80ac58cd), "ERC-721 id not reported");
        require(i.supportsInterface(0xd9b67a26), "ERC-1155 id not reported");
        require(b.supportsInterface(0x01ffc9a7), "ERC-165 id not reported");
        require(!b.supportsInterface(0xd9b67a26), "a 721 is not an 1155");
    }

    function test_AnErc20DoesNotAnswerInterfaceQueries() public {
        // ERC-20 predates ERC-165 and does not implement it, so the call
        // finds no matching function at all.
        CampusToken t = new CampusToken(address(this));
        (bool ok, ) = address(t).call(
            abi.encodeWithSignature("supportsInterface(bytes4)", bytes4(0x01ffc9a7))
        );
        require(!ok, "an ERC-20 should not answer interface queries");
    }

    function test_ReceiverIsWhatDistinguishesSafeTransfer() public {
        CampusBadge b = new CampusBadge(address(this));
        uint256 id = b.issue(address(this));
        // This test contract implements the receiver hook below, so it can.
        b.safeTransferFrom(address(this), address(this), id);
        require(b.ownerOf(id) == address(this), "self transfer failed");
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external pure returns (bytes4)
    {
        return this.onERC721Received.selector;
    }

    /// ERC-1155 applies the acceptance check on minting as well as on
    /// transfer, so a contract must implement this hook even to be issued
    /// tokens in the first place. ERC-721's plain mint does not.
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external pure returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }
}

/// A contract that spends someone else's allowance, which is the whole point
/// of the approve/transferFrom pattern.
contract Spender {
    function pull(CampusToken t, address from, address to, uint256 amount) external {
        t.transferFrom(from, to, amount);
    }
}
