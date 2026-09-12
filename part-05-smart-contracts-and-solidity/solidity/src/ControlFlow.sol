// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

contract ControlFlowExamples {
    uint256[] private queue;
    uint256 public cursor;

    function sumFirst(uint256[] calldata values, uint256 limit)
        external
        pure
        returns (uint256 total)
    {
        require(limit <= values.length, "limit too large");

        for (uint256 i = 0; i < limit; i++) {
            total += values[i];
        }
    }

    function firstAtLeast(uint256[] calldata values, uint256 target)
        external
        pure
        returns (bool found, uint256 index)
    {
        uint256 i = 0;
        while (i < values.length) {
            if (values[i] >= target) {
                return (true, i);
            }
            i++;
        }

        return (false, 0);
    }

    function enqueue(uint256 value) external {
        queue.push(value);
    }

    function queueLength() external view returns (uint256) {
        return queue.length;
    }

    function process(uint256 maxItems) external returns (uint256 total) {
        uint256 end = cursor + maxItems;
        if (end > queue.length) {
            end = queue.length;
        }

        while (cursor < end) {
            total += queue[cursor];
            cursor++;
        }
    }
}
