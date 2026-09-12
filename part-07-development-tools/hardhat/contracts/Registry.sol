// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Where Ownable has one privileged address, AccessControl has named
///         roles that many addresses can hold, each administered by another
///         role. A role identifier is just the hash of its name.
contract Registry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    mapping(address => bool) public enrolled;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function enrol(address who) external onlyRole(REGISTRAR_ROLE) {
        enrolled[who] = true;
    }
}
