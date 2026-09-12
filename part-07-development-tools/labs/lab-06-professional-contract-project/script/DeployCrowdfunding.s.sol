// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {Crowdfunding} from "../src/Crowdfunding.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployCrowdfunding {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (Crowdfunding campaign) {
        address beneficiary = vm.envAddress("BENEFICIARY_ADDRESS");
        vm.startBroadcast();
        campaign = new Crowdfunding(payable(beneficiary), 2 ether, uint64(block.timestamp + 1 days));
        vm.stopBroadcast();
    }
}
