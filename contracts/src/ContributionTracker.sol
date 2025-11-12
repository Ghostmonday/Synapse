// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract ContributionTracker is UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant TRACKER_ROLE = keccak256("TRACKER_ROLE");
    mapping(address => uint256) private _contributions;
    event ContributionRecorded(address indexed contributor, uint256 amount, string contributionType);

    function initialize() public initializer {
        __AccessControl_init();
        __Pausable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TRACKER_ROLE, msg.sender);
    }

    function recordContribution(address contributor, uint256 amount, string memory contributionType)
        external onlyRole(TRACKER_ROLE) whenNotPaused
    {
        _contributions[contributor] += amount;
        emit ContributionRecorded(contributor, amount, contributionType);
    }

    function getTotal(address contributor) external view returns (uint256) {
        return _contributions[contributor];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

