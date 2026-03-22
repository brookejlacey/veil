// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title Veil — Blind Negotiation Protocol
/// @notice Two parties negotiate without revealing their positions.
///         The contract determines if a deal exists and settles at the midpoint.
contract VeilNegotiation {
    enum Status { Open, Submitted, Settled, NoDeal, Cancelled }

    struct Negotiation {
        address partyA;
        address partyB;
        euint64 limitA;      // Party A's limit (e.g., seller's minimum)
        euint64 limitB;      // Party B's limit (e.g., buyer's maximum)
        euint64 settlement;  // Midpoint settlement price
        ebool dealExists;    // Encrypted result: buyer max >= seller min
        Status status;
        bool partyASubmitted;
        bool partyBSubmitted;
        uint256 createdAt;
        uint256 settledAt;
    }

    uint256 public nextNegotiationId;
    mapping(uint256 => Negotiation) public negotiations;

    event NegotiationCreated(uint256 indexed id, address partyA, address partyB);
    event LimitSubmitted(uint256 indexed id, address party);
    event DealSettled(uint256 indexed id);
    event NoDeal(uint256 indexed id);
    event NegotiationCancelled(uint256 indexed id);

    modifier onlyParty(uint256 id) {
        require(
            msg.sender == negotiations[id].partyA || msg.sender == negotiations[id].partyB,
            "Not a party to this negotiation"
        );
        _;
    }

    /// @notice Create a new negotiation between two parties
    /// @param counterparty The address of the other party
    /// @return id The negotiation ID
    function createNegotiation(address counterparty) external returns (uint256 id) {
        require(counterparty != address(0), "Invalid counterparty");
        require(counterparty != msg.sender, "Cannot negotiate with yourself");

        id = nextNegotiationId++;

        Negotiation storage n = negotiations[id];
        n.partyA = msg.sender;
        n.partyB = counterparty;
        n.status = Status.Open;
        n.createdAt = block.timestamp;

        emit NegotiationCreated(id, msg.sender, counterparty);
    }

    /// @notice Submit your encrypted limit (price floor or ceiling)
    /// @param id The negotiation ID
    /// @param encryptedLimit Your encrypted limit value
    function submitLimit(uint256 id, InEuint64 memory encryptedLimit) external onlyParty(id) {
        Negotiation storage n = negotiations[id];
        require(n.status == Status.Open, "Negotiation not open");

        euint64 limit = FHE.asEuint64(encryptedLimit);

        if (msg.sender == n.partyA) {
            require(!n.partyASubmitted, "Already submitted");
            n.limitA = limit;
            n.partyASubmitted = true;
            FHE.allowThis(n.limitA);
        } else {
            require(!n.partyBSubmitted, "Already submitted");
            n.limitB = limit;
            n.partyBSubmitted = true;
            FHE.allowThis(n.limitB);
        }

        emit LimitSubmitted(id, msg.sender);

        // Auto-resolve when both limits are in
        if (n.partyASubmitted && n.partyBSubmitted) {
            n.status = Status.Submitted;
            _resolve(id);
        }
    }

    /// @notice Internal resolution: check overlap and compute midpoint
    function _resolve(uint256 id) internal {
        Negotiation storage n = negotiations[id];

        // Check if Party B's limit >= Party A's limit (deal exists)
        // Convention: A = seller (floor), B = buyer (ceiling)
        // Deal exists when buyer's max >= seller's min
        n.dealExists = FHE.gte(n.limitB, n.limitA);

        // Compute midpoint: (limitA + limitB) / 2
        euint64 sum = FHE.add(n.limitA, n.limitB);
        euint64 TWO = FHE.asEuint64(2);
        euint64 midpoint = FHE.div(sum, TWO);

        // If deal exists, settlement = midpoint; otherwise settlement = 0
        euint64 zero = FHE.asEuint64(0);
        n.settlement = FHE.select(n.dealExists, midpoint, zero);

        FHE.allowThis(n.settlement);
        FHE.allowThis(n.dealExists);

        // Allow both parties to unseal the settlement and deal result
        FHE.allow(n.settlement, n.partyA);
        FHE.allow(n.settlement, n.partyB);
        FHE.allow(n.dealExists, n.partyA);
        FHE.allow(n.dealExists, n.partyB);

        // Request decryption of dealExists to determine outcome
        FHE.decrypt(n.dealExists);

        n.settledAt = block.timestamp;
    }

    /// @notice Finalize the negotiation after async decryption completes
    /// @param id The negotiation ID
    function finalize(uint256 id) external {
        Negotiation storage n = negotiations[id];
        require(n.status == Status.Submitted, "Not ready to finalize");

        // Check the decrypted dealExists result
        (bool hasDeal, bool decrypted) = FHE.getDecryptResultSafe(n.dealExists);

        require(decrypted, "Decryption not ready");

        if (hasDeal) {
            n.status = Status.Settled;
            // Request decryption of settlement for both parties
            FHE.decrypt(n.settlement);
            emit DealSettled(id);
        } else {
            n.status = Status.NoDeal;
            emit NoDeal(id);
        }
    }

    /// @notice Cancel an open negotiation (only before both parties submit)
    /// @param id The negotiation ID
    function cancel(uint256 id) external onlyParty(id) {
        Negotiation storage n = negotiations[id];
        require(n.status == Status.Open, "Can only cancel open negotiations");
        n.status = Status.Cancelled;
        emit NegotiationCancelled(id);
    }

    /// @notice Get the settlement price (only after deal is settled)
    /// @param id The negotiation ID
    function getSettlement(uint256 id) external view returns (uint256) {
        Negotiation storage n = negotiations[id];
        require(n.status == Status.Settled, "No settlement");
        require(
            msg.sender == n.partyA || msg.sender == n.partyB,
            "Not a party"
        );

        (uint64 value, bool decrypted) = FHE.getDecryptResultSafe(n.settlement);
        require(decrypted, "Settlement not decrypted yet");

        return uint256(value);
    }

    /// @notice Get negotiation status
    function getStatus(uint256 id) external view returns (Status) {
        return negotiations[id].status;
    }
}
