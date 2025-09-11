# Implementation Plan

- [x] 1. Establish Project Structure and Core Utility Classes
  - Create the basic HTML page structure, including the control panel, main panel, and log panel.
  - Implement the `Crypto` service class, providing key generation, signature verification, hash calculation, and Base64 encoding.
  - Create the `Timer` class for tick counting and network delay simulation.
  - Write unit tests for the basic utility classes.
  - _Requirements: 2.1, 2.4, 11.4_

- [-] 2. Implement Data Models and Base Classes
- [x] 2.1 Create `Block` Class and Basic Validation
  - Implement the `Block` class constructor, ID generation, signing, and basic validation methods.
  - Write unit tests for the `Block` class to verify block creation and signing.
  - Implement serialization and deserialization of block data.
  - _Requirements: 4.3, 5.2, 5.3_

- [x] 2.2 Implement `BlockChain` Class and Management
  - Create the `BlockChain` class, implementing the creation of root and ownership blocks.
  - Implement block addition, querying, and validation for the blockchain.
  - Write unit tests for the `BlockChain` class to test its integrity.
  - Implement the basic logic for fork detection.
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2.3 Create `User` Class and Identity Management
  - Implement key pair generation and public key identification for the `User` class.
  - Implement the creation and signing of transfer blocks.
  - Write unit tests for the `User` class to verify identity and block creation.
  - Implement user asset querying and management.
  - _Requirements: 2.1, 2.2, 2.3, 5.1_

- [-] 3. Implement Network Layer and Node Communication
- [x] 3.1 Create `Node` Class and Basic Network Functions
  - Implement the `Node` class constructor and key pair generation.
  - Implement connection establishment and signature verification between nodes.
  - Write unit tests for the `Node` class to test identity verification.
  - Implement basic message receiving and forwarding.
  - _Requirements: 3.1, 3.2_

- [x] 3.2 Implement `NetManager` Class and Network Management
  - Create the `NetManager` class, implementing network initialization and connection management.
  - Implement message broadcasting and network status querying.
  - Write unit tests for the `NetManager` class to test network connections and message propagation.
  - Implement connection failure rate simulation and dynamic adjustment.
  - _Requirements: 1.1, 3.3, 3.4_

- [x] 3.3 Implement Message Routing and Network Delay Simulation
  - Create a message routing system with priority handling.
  - Implement network delay simulation, supporting a transmission time of 1-9 ticks.
  - Write unit tests for network delay and message routing.
  - Implement the calculation of the total network broadcast time.
  - _Requirements: 8.2, 8.4_

- [x] 4. Implement Block Validation Engine
- [x] 4.1 Create Cryptographic Validation in `Validator`
  - Implement cryptographic signature verification for blocks.
  - Implement blockchain integrity verification, validating from the current block up to the root.
  - Write unit tests for cryptographic validation.
  - Implement a caching mechanism for validation results to avoid redundant checks.
  - _Requirements: 6.1, 6.2_

- [x] 4.2 Implement Block Legality Validation
  - Implement creator status validation (blacklist check).
  - Implement blockchain ownership verification.
  - Implement block position conflict detection.
  - Write unit tests for legality validation.
  - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 4.3 Implement Double-Spend Attack Detection and Security
  - Implement the logic for detecting double-spend attacks.
  - Implement user blacklist management and fork warning broadcasts.
  - Write unit tests for double-spend attack detection.
  - Implement handling for high-priority security messages.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5. Implement Reception Validation and Confirmation
- [x] 5.1 Implement Time Validation and Rejection
  - Implement block reception time validation, checking if it exceeds twice the network broadcast time.
  - Implement the creation and broadcasting of rejection blocks.
  - Write unit tests for time validation.
  - Implement dynamic calculation of the network broadcast time.
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 5.2 Implement Confirmation Wait and Conflict Detection
  - Implement management of the confirmation waiting period (four times the network broadcast time).
  - Implement detection of conflicting blocks and warnings during the waiting period.
  - Write unit tests for the confirmation mechanism.
  - Implement the final confirmation of blockchain transfers.
  - _Requirements: 8.4, 8.5_

- [-] 6. Implement Blockchain Definition and Initialization
- [x] 6.1 Create Blockchain Definition Parser
  - Implement the parsing of the blockchain definition file.
  - Implement the handling of serial number ranges and their corresponding denominations.
  - Write unit tests for the definition file parser.
  - Implement SHA256 hash calculation for the definition file.
  - _Requirements: 4.1_

- [x] 6.2 Implement Batch Blockchain Creation and Initialization
  - Implement the batch creation of blockchains based on the definition file.
  - Implement the logic for randomly assigning blockchain ownership.
  - Write unit tests for blockchain initialization.
  - Implement the generation and management of blockchain identifiers.
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 7. Implement UI Base Framework
- [x] 7.1 Create `UIManager` and Basic UI Structure
  - Implement the basic framework and UI initialization for the `UIManager` class.
  - Create the basic HTML structure for the control panel, main panel, and log panel.
  - Implement a responsive layout and basic styling for the UI.
  - Write basic tests for the UI components.
  - _Requirements: 9.1_

- [x] 7.2 Implement `CtrlPanel` Functionality
  - Implement the functionality for the start, pause, resume, and stop buttons.
  - Implement the UI for setting network parameters (node count, user count, connections, failure rate, payment rate).
  - Implement the UI for editing the blockchain definition file.
  - Write interaction tests for the control panel.
  - _Requirements: 11.1, 11.2, 1.1, 1.3_

- [x] 7.3 Implement Runtime Control and Tick Time Adjustment
  - Implement runtime adjustment of parameters (connections, failure rate).
  - Implement the tick time slider control (3 seconds to unlimited).
  - Implement the control interface for simulating fork attacks.
  - Write functional tests for runtime controls.
  - _Requirements: 11.3, 11.4, 11.5, 1.4_

- [-] 8. Implement Main Panel Data Display
- [x] 8.1 Implement User Asset and Blockchain Ownership Display
  - Implement the display of total asset value for all virtual users.
  - Implement the display of the current ownership of all blockchains.
  - Implement a real-time update and refresh mechanism for the data.
  - Write functional tests for the data display.
  - _Requirements: 9.4_

- [x] 8.2 Implement Interactive Detailed Information View
  - Implement the feature to view all blockchains owned by a user upon clicking.
  - Implement the feature to view all blocks of a blockchain upon clicking.
  - Implement filtered display of relevant logs.
  - Write UI tests for the interactive features.
  - _Requirements: 10.1, 10.2_

- [-] 9. Implement Logging System and Panel
- [x] 9.1 Create `Logger` Class and Logging Functionality
  - Implement the basic logging functionality for the `Logger` class.
  - Implement categorized management of different log types (add, accept, reject, warn, blacklist).
  - Write unit tests for the logging system.
  - Implement timestamping and recording of related data for logs.
  - _Requirements: 9.2_

- [x] 9.2 Implement `LogPanel` Display and Pagination
  - Implement the display for the log panel, supporting the latest 100 logs.
  - Implement pagination and history viewing for logs.
  - Implement filtering and searching for logs.
  - Write functional tests for the log panel.
  - _Requirements: 9.3, 10.1, 10.2_

- [x] 9.3 Implement Log Interaction and Detailed Info Display
  - Implement the feature to view related blockchain and user info upon clicking a log.
  - Implement linked display between the log panel and the main panel.
  - Write integration tests for log interaction.
  - _Requirements: 10.3_

- [-] 10. Implement Base64 Data Validation
- [x] 10.1 Implement Shortened Display and Hover for Base64 Data
  - Implement shortened display for all Base64 data.
  - Implement the feature to view the full content on hover.
  - Implement data selection and highlighting.
  - Write UI tests for the Base64 display.
  - _Requirements: 2.5, 10.4_

- [x] 10.2 Implement Validation Code Generation and Display
  - Implement the feature to display validation code when Base64 data is selected.
  - Implement the generation of corresponding validation code for different data types (signature, hash).
  - Implement the feature to run the validation code directly.
  - Write functional tests for validation code generation.
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 11. Implement Payment Rate and Auto-Transfer
- [x] 11.1 Implement Payment Rate Control System
  - Implement the feature to control the transfer frequency of virtual users based on the payment rate parameter.
  - Implement the logic for randomly selecting users to make transfers in each tick.
  - Write unit tests for the payment rate control.
  - Implement the algorithm for randomly selecting transfer target users.
  - _Requirements: 1.3_

- [x] 11.2 Implement Auto-Transfer and Network Activity Simulation
  - Implement the automatic transfer decision logic for virtual users.
  - Implement the automatic creation and broadcasting of transfer blocks.
  - Write integration tests for auto-transfer.
  - Implement statistics and monitoring of network activity.
  - _Requirements: 5.1, 5.4_

- [-] 12. Integration Testing and System Optimization
- [x] 12.1 Implement End-to-End Blockchain Transfer Flow Testing
  - Write integration tests for the complete blockchain transfer flow.
  - Test the entire process from creating a transfer block to final confirmation.
  - Verify the correctness of network propagation, validation, and confirmation.
  - Test the handling of multiple concurrent transfers.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1-6.6, 8.1-8.5_

- [x] 12.2 Implement Security and Attack Detection Integration Testing
  - Write complete test scenarios for double-spend attack detection.
  - Test the broadcasting and handling of fork warnings.
  - Verify the effectiveness of the user blacklist and security measures.
  - Test the system's stability under various attack scenarios.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12.3 Implement Performance Optimization and Large-Scale Network Testing
  - Optimize the performance of cryptographic calculations with asynchronous processing.
  - Optimize UI rendering performance with virtual scrolling and batch updates.
  - Test the performance of a large-scale network (many nodes, many users).
  - Implement memory management and resource cleanup.
  - _Requirements: All performance-related requirements_

- [x] 13. Enhance User Experience and Error Handling
- [x] 13.1 Implement Complete Error Handling and User Feedback
  - Implement graceful handling and user notifications for various error conditions.
  - Implement real-time monitoring of the system state and exception recovery.
  - Write test cases for error handling.
  - Implement debugging information and developer tools.
  - _Requirements: All error handling-related requirements_

- [x] 13.2 Implement Final UI Optimization and UX Improvements
  - Optimize the responsiveness and interactive experience of the UI.
  - Implement full keyboard navigation and accessibility support.
  - Complete the validation code functionality for all Base64 data.
  - Conduct final user experience testing and optimization.
  - _Requirements: 9.1-9.4, 10.1-10.4, 11.1-11.5_

- [-] 14. System Integration and Final Testing
- [x] 14.1 Conduct Full System Integration Testing
  - Test the collaborative work of all functional modules.
  - Verify the system's stability under various configurations.
  - Test the long-term stability of the system.
  - Verify the complete implementation of all requirements.
  - _Requirements: All requirements_

- [x] 14.2 Complete Documentation and Deployment Preparation
  - Complete code comments and technical documentation.
  - Create a user manual and operational guide.
  - Prepare the build configuration for the production environment.
  - Conduct a final code review and quality check.
  - _Requirements: Deployment and maintenance-related requirements_
