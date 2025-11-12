// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ContributionTracker.sol";

contract ContributionTrackerTest is Test {
    ContributionTracker tracker;

    function setUp() public {
        tracker = new ContributionTracker();
        tracker.initialize();
        // grant TRACKER_ROLE to this contract
        bytes32 role = tracker.TRACKER_ROLE();
        vm.prank(address(this));
        // Admin by default is msg.sender at initialize; for tests this is fine
        tracker.grantRole(role, address(this));
    }

    function testRecordContribution() public {
        tracker.recordContribution(address(1), 100, "code");
        assertEq(tracker.getTotal(address(1)), 100);
    }
}

