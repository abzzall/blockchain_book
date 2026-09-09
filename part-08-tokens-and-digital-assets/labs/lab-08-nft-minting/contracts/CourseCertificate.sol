// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * A certificate as a non-fungible token. Each token id is distinct, has exactly
 * one owner, and carries a URI pointing at its metadata. The URI is the whole
 * subject of this lab: the chain stores the pointer, and almost never the thing
 * pointed at.
 */
contract CourseCertificate is ERC721, ERC721URIStorage, Ownable {
    error NotTheOwner(uint256 tokenId, address caller);

    event CertificateIssued(address indexed to, uint256 indexed tokenId, string uri);

    uint256 private nextTokenId = 1;

    constructor() ERC721("Blockchain Course Certificate", "BCC") Ownable(msg.sender) {}

    /// Only the course issues certificates; a recipient cannot mint their own.
    function issue(address to, string calldata uri) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit CertificateIssued(to, tokenId, uri);
    }

    /// A holder may destroy their own certificate; nobody else may.
    function burn(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTheOwner(tokenId, msg.sender);
        _burn(tokenId);
    }

    function issuedCount() external view returns (uint256) {
        return nextTokenId - 1;
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
