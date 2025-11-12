// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract EquityDistributor is UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    uint256 public totalWeight;
    mapping(address => uint256) public weights;
    event EquityDistributed(address indexed recipient, uint256 amount);

    function initialize() public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
    }

    function recordWeight(address contributor, uint256 time, uint256 participation, uint256 complexity, uint256 cost)
        external onlyRole(DISTRIBUTOR_ROLE)
    {
        uint256 weight = time * participation * complexity * cost;
        weights[contributor] += weight;
        totalWeight += weight;
    }

    function distributeEquity(address recipient, uint256 pool) external onlyRole(DISTRIBUTOR_ROLE) {
        require(totalWeight > 0, "no weights");
        uint256 share = (weights[recipient] * pool) / totalWeight;
        emit EquityDistributed(recipient, share);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

