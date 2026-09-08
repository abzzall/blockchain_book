// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {OffChainMetadata, OnChainMetadata} from "../src/Metadata.sol";

contract MetadataTest {
    function test_OffChainUriIsJustAStringTheContractStores() public {
        OffChainMetadata m = new OffChainMetadata("https://example.invalid/");
        require(
            keccak256(bytes(m.tokenURI(42)))
                == keccak256("https://example.invalid/42.json"),
            "uri wrong"
        );
    }

    /// The whole collection can be repointed by one transaction. The tokens
    /// did not change; what they refer to did.
    function test_TheOwnerCanRepointEveryToken() public {
        OffChainMetadata m = new OffChainMetadata("https://example.invalid/");
        m.setBase("https://somewhere-else.invalid/");
        require(
            keccak256(bytes(m.tokenURI(42)))
                == keccak256("https://somewhere-else.invalid/42.json"),
            "repointing failed"
        );
    }

    function test_OnChainUriIsComputedAndNeedsNothingFetched() public {
        OnChainMetadata m = new OnChainMetadata();
        m.set(1, 0xff);
        string memory uri = m.tokenURI(1);
        require(_startsWith(uri, "data:image/svg+xml;utf8,"), "not a data uri");
        require(_contains(uri, "#ffffff"), "shade not rendered");
    }

    function test_OnChainMetadataChangesOnlyWhenStateDoes() public {
        OnChainMetadata m = new OnChainMetadata();
        string memory before_ = m.tokenURI(1);
        m.set(1, 0x11);
        require(
            keccak256(bytes(before_)) != keccak256(bytes(m.tokenURI(1))),
            "uri should follow state"
        );
    }

    function _startsWith(string memory s, string memory p) private pure returns (bool) {
        bytes memory sb = bytes(s); bytes memory pb = bytes(p);
        if (sb.length < pb.length) return false;
        for (uint256 i; i < pb.length; i++) if (sb[i] != pb[i]) return false;
        return true;
    }

    function _contains(string memory s, string memory n) private pure returns (bool) {
        bytes memory sb = bytes(s); bytes memory nb = bytes(n);
        if (sb.length < nb.length) return false;
        for (uint256 i; i <= sb.length - nb.length; i++) {
            bool ok = true;
            for (uint256 j; j < nb.length; j++) if (sb[i+j] != nb[j]) { ok = false; break; }
            if (ok) return true;
        }
        return false;
    }
}
