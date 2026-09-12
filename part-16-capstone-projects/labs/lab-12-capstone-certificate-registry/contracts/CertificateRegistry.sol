// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

/**
 * CAPSTONE SKELETON — you implement this.
 *
 * Every function below reverts with `NotImplemented`. Replace each body with a
 * working implementation until the acceptance suite in
 * `test/Acceptance.ts` passes. Do not change the function signatures, the
 * events, or the error names: the acceptance suite depends on all three, and
 * so does the marking.
 *
 * You MAY add state variables, internal helpers, modifiers, and further custom
 * errors. You MAY NOT change what the supplied errors are called or when the
 * specification says they must fire.
 *
 * The specification is in LAB.md. Read it before writing anything.
 */
contract CertificateRegistry {
    // ---------------------------------------------------------------- errors
    error NotImplemented();
    error IssuerOnly(address caller);
    error NotAnIssuer(address account);
    error AlreadyAnIssuer(address account);
    error EmptyField();
    error CertificateNotFound(bytes32 certificateId);
    error CertificateExists(bytes32 certificateId);
    error AlreadyRevoked(bytes32 certificateId);
    error ZeroAddress();

    // ---------------------------------------------------------------- events
    event IssuerAdded(address indexed account, address indexed by);
    event IssuerRemoved(address indexed account, address indexed by);
    event CertificateIssued(
        bytes32 indexed certificateId,
        address indexed recipient,
        address indexed issuer,
        string courseName,
        uint64 issuedAt
    );
    event CertificateRevoked(bytes32 indexed certificateId, address indexed by, string reason);

    // ----------------------------------------------------------------- types
    struct Certificate {
        address recipient;
        address issuer;
        string courseName;
        uint16 grade;
        uint64 issuedAt;
        bool revoked;
        string revocationReason;
    }

    // ------------------------------------------------------------- interface

    /// The account that deployed the registry. It is an issuer from the start
    /// and is the only account that may add or remove issuers.
    function admin() external view returns (address) {
        revert NotImplemented();
    }

    function isIssuer(address account) external view returns (bool) {
        revert NotImplemented();
    }

    function addIssuer(address account) external {
        revert NotImplemented();
    }

    function removeIssuer(address account) external {
        revert NotImplemented();
    }

    /**
     * The deterministic identity of a certificate. Two certificates for the
     * same recipient and course from the same issuer are the same certificate.
     * Must be a pure function of its arguments so anyone can recompute it.
     */
    function certificateId(address recipient, address issuer, string calldata courseName)
        public pure returns (bytes32)
    {
        revert NotImplemented();
    }

    function issue(address recipient, string calldata courseName, uint16 grade)
        external returns (bytes32)
    {
        revert NotImplemented();
    }

    function revoke(bytes32 id, string calldata reason) external {
        revert NotImplemented();
    }

    function get(bytes32 id) external view returns (Certificate memory) {
        revert NotImplemented();
    }

    /// True only if the certificate exists and has not been revoked.
    function isValid(bytes32 id) external view returns (bool) {
        revert NotImplemented();
    }

    function totalIssued() external view returns (uint256) {
        revert NotImplemented();
    }

    /// Every certificate id held by one recipient, in the order they were issued.
    function certificatesOf(address recipient) external view returns (bytes32[] memory) {
        revert NotImplemented();
    }
}
