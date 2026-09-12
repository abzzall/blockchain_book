// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice The two ways a token can say what it represents, reduced to the
///         part that matters. Neither contract implements the full ERC-721
///         interface; the point here is only where `tokenURI` gets its answer.

/// Metadata that lives somewhere else. The contract stores a string and
/// returns it. Whatever is at the other end can change, or stop existing,
/// without the chain noticing.
contract OffChainMetadata {
    string private _base;
    address public immutable owner;

    constructor(string memory base_) {
        _base = base_;
        owner = msg.sender;
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        return string.concat(_base, _toString(id), ".json");
    }

    /// The owner can repoint every token in the collection at once.
    function setBase(string calldata base_) external {
        require(msg.sender == owner, "not owner");
        _base = base_;
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 n = v;
        uint256 digits;
        while (n != 0) { digits++; n /= 10; }
        bytes memory b = new bytes(digits);
        while (v != 0) { b[--digits] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}

/// Metadata built by the contract itself and returned as a data URI. There is
/// nothing to fetch and nothing to go missing: the answer is computed from
/// state every time it is asked for.
contract OnChainMetadata {
    mapping(uint256 => uint8) public shade;

    function set(uint256 id, uint8 value) external {
        shade[id] = value;
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">',
            '<rect width="8" height="8" fill="#',
            _hex(shade[id]), _hex(shade[id]), _hex(shade[id]),
            '"/></svg>'
        );
        return string.concat("data:image/svg+xml;utf8,", svg);
    }

    function _hex(uint8 v) internal pure returns (string memory) {
        bytes memory d = "0123456789abcdef";
        bytes memory o = new bytes(2);
        o[0] = d[v >> 4];
        o[1] = d[v & 0x0f];
        return string(o);
    }
}
