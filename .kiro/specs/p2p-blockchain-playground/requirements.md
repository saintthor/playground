# Requirements Document

## Introduction

This is a P2P network blockchain demonstration playground designed to showcase the transfer, validation, and security mechanisms of blockchains in a distributed network. The system simulates a network environment with m nodes and n virtual users, supporting the transfer of both blockchain and block tree data structures. The system creates all blockchains at once based on a definition file set by the player. Virtual users can transfer blockchains, and the system automatically handles network propagation, validation, and security checks. The player (the real person visiting the webpage) can observe and control the entire network's operation.

## Requirements

### Requirement 1

**User Story:** As a player, I want to be able to configure P2P network parameters to create and test network environments of different scales and characteristics.

#### Acceptance Criteria

1.  WHEN the player starts the system, THEN the system SHALL provide a configuration interface to set the number of nodes, virtual users, node connections, and connection failure rate.
2.  WHEN the player sets the serial number ranges and their corresponding denominations, THEN the system SHALL generate the appropriate number and value of blockchains.
3.  WHEN the player sets the payment rate parameter, THEN the system SHALL have a corresponding percentage of virtual users transfer blockchain banknotes to others in each tick.
4.  WHEN the player modifies the tick time setting, THEN the system SHALL adjust the time base for network transmission and processing.
5.  WHEN the player adjusts network parameters at runtime, THEN the system SHALL update the network connection status and failure rate in real-time.

### Requirement 2

**User Story:** As a virtual user, I want to have a unique key pair for identity verification to securely perform blockchain operations on the network.

#### Acceptance Criteria

1.  WHEN the system initializes, THEN it SHALL generate a unique public-private key pair for each virtual user.
2.  WHEN the system initializes, THEN it SHALL generate a unique public-private key pair for each node.
3.  WHEN a virtual user performs a block operation, THEN the system SHALL use the private key to sign the operation data.
4.  WHEN displaying a virtual user or node identifier, THEN the system SHALL use the Base64 encoded public key as the identifier.
5.  WHEN Base64 data is displayed on the interface, THEN the system SHALL provide a shortened view and a way to see the full content on hover.

### Requirement 3

**User Story:** As a network node, I want to be able to establish secure connections with other nodes to participate in P2P network communication.

#### Acceptance Criteria

1.  WHEN a node attempts to connect to another node, THEN the system SHALL verify the other node's signature.
2.  WHEN the node connection is successfully verified, THEN the system SHALL establish the connection and use the public key to identify the other node.
3.  WHEN the number of connections exceeds the maximum limit, THEN the system SHALL limit the number of connections for each node.
4.  WHEN a network connection fails, THEN the system SHALL simulate a connection interruption based on the set failure rate.

### Requirement 4

**User Story:** As the system, I want to be able to create blockchains from a definition file to establish a standardized digital asset system.

#### Acceptance Criteria

1.  WHEN the system starts, THEN it SHALL read the blockchain definition file and parse the serial number ranges and their corresponding denominations.
2.  WHEN creating a root block, THEN the system SHALL include the SHA256 hash of the definition file and the digital serial number in the root block.
3.  WHEN the root block is created, THEN the system SHALL use the SHA256 hash of the root block as the blockchain identifier.
4.  WHEN the root block is created, THEN the system SHALL automatically add a second block and randomly assign a virtual user as the blockchain owner.

### Requirement 5

**User Story:** As a blockchain owner (virtual user), I want to be able to transfer a blockchain to another virtual user to enable the circulation of digital assets.

#### Acceptance Criteria

1.  WHEN a virtual user is the current owner of a blockchain, THEN the system SHALL allow that user to create a transfer block.
2.  WHEN creating a transfer block, THEN the system SHALL include the blockchain identifier, the parent block identifier, the target virtual user's public key, and the timestamp in the block.
3.  WHEN a transfer block is created, THEN the system SHALL use the creator's signature as the block identifier.
4.  WHEN the transfer block is complete, THEN the system SHALL broadcast the new block to the network.

### Requirement 6

**User Story:** As a network node, I want to be able to validate received blocks to ensure the integrity and legality of the network data.

#### Acceptance Criteria

1.  WHEN a node receives a new block broadcast, THEN the system SHALL first verify the block's cryptographic signature.
2.  WHEN the cryptographic verification passes, THEN the system SHALL verify all blockchain relationships and ownership transfers up to the root block, skipping previously verified and saved data.
3.  WHEN the blockchain relationship verification passes, THEN the system SHALL verify the block's legality.
4.  WHEN verifying the block creator's status, THEN the system SHALL confirm the creator is not on the blacklist.
5.  WHEN verifying blockchain ownership, THEN the system SHALL confirm the creator is the current owner of the blockchain.
6.  WHEN verifying the block's position, THEN the system SHALL confirm there are no other blocks at the same position.
7.  WHEN a fork exists, THEN the system SHALL verify that the new block is added to an approved fork.

### Requirement 7

**User Story:** As a network security system, I want to be able to detect and handle double-spend attacks to maintain network security.

#### Acceptance Criteria

1.  WHEN multiple blocks are detected at the same position, THEN the system SHALL identify it as a double-spend attack.
2.  WHEN a double-spend attack is confirmed, THEN the system SHALL add the attacker to a blacklist.
3.  WHEN a fork event is detected, THEN the system SHALL broadcast a warning message with high priority.
4.  WHEN broadcasting a fork warning, THEN the system SHALL include information about all conflicting blocks in the message.

### Requirement 8

**User Story:** As a blockchain recipient, I want the system to validate the blockchain transferred to me to ensure the received asset is legitimate.

#### Acceptance Criteria

1.  WHEN the target virtual user of a new block is a virtual user on the current node, THEN the system SHALL start the reception validation process.
2.  WHEN performing time validation, THEN the system SHALL check that the time from block creation to reception does not exceed twice the network broadcast time.
3.  WHEN time validation fails, THEN the system SHALL add a rejection block and broadcast it.
4.  WHEN time validation passes, THEN the system SHALL continue to broadcast the new block and wait for a confirmation period.
5.  WHEN no conflicting blocks or warnings are received during the waiting period, THEN the system SHALL confirm the reception of the blockchain.

### Requirement 9

**User Story:** As a player, I want an intuitive interface that displays the network status and operation logs to monitor and analyze the system's operation.

#### Acceptance Criteria

1.  WHEN the system is running, THEN the interface SHALL display three sections: a control panel, a main panel, and a log panel.
2.  WHEN a new operation occurs, THEN the log panel SHALL record operations such as block additions, acceptances, rejections, warnings, and blacklistings.
3.  WHEN the number of log entries exceeds 100, THEN the system SHALL only display the most recent 100 entries, with support for manual pagination to view history.
4.  WHEN in the main panel, THEN the system SHALL display the total asset value of all virtual users and the ownership of all blockchains.

### Requirement 10

**User Story:** As a player, I want to be able to interactively view detailed information to deeply understand the status of a specific virtual user or blockchain.

#### Acceptance Criteria

1.  WHEN a virtual user is clicked, THEN the system SHALL display all blockchains owned by that user, and the logs SHALL only show relevant entries.
2.  WHEN a blockchain is clicked, THEN the system SHALL display all blocks within it, and the logs SHALL only show relevant entries.
3.  WHEN a log entry is clicked, THEN the system SHALL display information about the related blockchain and virtual user.
4.  WHEN hovering over Base64 data, THEN the system SHALL display the full data content.

### Requirement 11

**User Story:** As a player, I want to be able to verify the authenticity of Base64 data to understand the specific implementation of cryptographic validation.

#### Acceptance Criteria

1.  WHEN the player selects any Base64 formatted data, THEN the system SHALL display a JavaScript code snippet showing how to verify this data (signature or hash).
2.  WHEN the verification code is displayed, THEN the system SHALL provide a feature to run the code directly.
3.  WHEN the player needs external verification, THEN the system SHALL allow the player to copy the code to the browser console to run it.
4.  WHEN the verification code is run, THEN the system SHALL display the validation result and related cryptographic information.

### Requirement 12

**User Story:** As a playground operator, I want to be able to control the system's running state to conduct various testing scenarios.

#### Acceptance Criteria

1.  WHEN in the control panel, THEN the system SHALL provide start, pause/resume, and stop buttons.
2.  WHEN before the run starts, THEN the system SHALL allow setting network parameters and editing the blockchain definition file.
3.  WHEN after the run starts, THEN the system SHALL allow adjusting the number of node connections and the connection failure rate.
4.  WHEN adjusting the tick time slider, THEN the system SHALL change the correspondence between ticks and real-time (slowest 3 seconds, fastest unlimited).
5.  WHEN the player issues a fork attack command, THEN the system SHALL have the specified virtual user carry out a fork attack to test security.
