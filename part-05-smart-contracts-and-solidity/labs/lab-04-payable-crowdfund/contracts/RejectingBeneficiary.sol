// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {CourseCrowdfund} from "./CourseCrowdfund.sol";

/// A beneficiary that refuses payment, used to show what a failed transfer does.
contract RejectingBeneficiary {
    function pull(CourseCrowdfund campaign) external {
        campaign.withdraw();
    }

    receive() external payable {
        revert("I refuse");
    }
}
