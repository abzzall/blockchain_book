// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {CampusToken} from "../contracts/CampusToken.sol";
import {Registry} from "../contracts/Registry.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract OpenZeppelinTest {
    function test_TokenUsesEighteenDecimalsByDefault() public {
        CampusToken t = new CampusToken(address(this));
        require(t.decimals() == 18, "decimals should default to 18");
    }

    function test_OwnerIsWhoeverTheConstructorWasGiven() public {
        CampusToken t = new CampusToken(address(0xBEEF));
        require(t.owner() == address(0xBEEF), "owner not set from argument");
    }

    function test_MintingIsRestrictedToTheOwner() public {
        // This contract is not the owner, so the call must fail.
        CampusToken t = new CampusToken(address(0xBEEF));
        (bool ok, bytes memory data) = address(t).call(
            abi.encodeWithSignature("mint(address,uint256)", address(this), 1)
        );
        require(!ok, "a non-owner was allowed to mint");
        // Version 5 reverts with a custom error, not a string.
        bytes4 selector = bytes4(data);
        require(
            selector == Ownable.OwnableUnauthorizedAccount.selector,
            "expected the OwnableUnauthorizedAccount custom error"
        );
    }

    function test_DefaultAdminRoleIsTheZeroWord() public {
        Registry r = new Registry(address(this));
        require(r.DEFAULT_ADMIN_ROLE() == bytes32(0), "admin role should be 0");
    }

    function test_ARoleIdentifierIsTheHashOfItsName() public {
        Registry r = new Registry(address(this));
        require(
            r.REGISTRAR_ROLE() == keccak256("REGISTRAR_ROLE"),
            "role id should be the hash of the name"
        );
    }

    function test_RolesAreGrantedAndEnforced() public {
        Registry r = new Registry(address(this));

        (bool before_, bytes memory data) = address(r).call(
            abi.encodeWithSignature("enrol(address)", address(0x1234))
        );
        require(!before_, "should not be allowed without the role");
        require(
            bytes4(data) == IAccessControl.AccessControlUnauthorizedAccount.selector,
            "expected the AccessControlUnauthorizedAccount custom error"
        );

        r.grantRole(r.REGISTRAR_ROLE(), address(this));
        r.enrol(address(0x1234));
        require(r.enrolled(address(0x1234)), "enrolment did not take");
    }
}
