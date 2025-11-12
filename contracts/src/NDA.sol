// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract NDA is EIP712 {
    bytes32 public constant NDA_TYPEHASH = keccak256("NDA(address signer,uint256 timestamp,string terms)");
    mapping(address => bool) public signed;

    constructor() EIP712("NDA", "1") {}

    function signNDA(uint256 timestamp, string memory terms, bytes memory signature) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(NDA_TYPEHASH, msg.sender, timestamp, keccak256(bytes(terms))))
        );
        address signer = ECDSA.recover(digest, signature);
        require(signer == msg.sender, "Invalid signature");
        signed[msg.sender] = true;
    }
}

