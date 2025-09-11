# UI Improvement Requirements

## Introduction

This document outlines UI improvements for the P2P Blockchain Playground, addressing issues with network graph display, UI repaint performance, and log display to enhance user experience and performance.

## Requirements

### Requirement 1

**User Story:** As a user, I want hash value validation to be displayed in a floating window for a more intuitive view of the validation information.

#### Acceptance Criteria

1.  WHEN the user hovers over a hash value for more than 1 second, THEN the system SHALL display a floating validation window.
2.  WHEN the floating window is displayed, THEN it SHALL contain the full hash value and validation code.
3.  WHEN the user's mouse leaves the hash value area, THEN the system SHALL hide the floating window.
4.  WHEN the user clicks the copy button within the floating window, THEN the system SHALL successfully copy the validation code to the clipboard.

### Requirement 2

**User Story:** As a user, I want the copy functionality for validation code to work correctly so I can run the validation in the console.

#### Acceptance Criteria

1.  WHEN the user clicks the "Copy Code" button, THEN the system SHALL successfully copy the validation code to the clipboard.
2.  WHEN the user clicks the "Copy to Clipboard" button, THEN the system SHALL successfully copy the console code to the clipboard.
3.  WHEN the copy operation is complete, THEN the system SHALL display a success feedback message.
4.  WHEN the copy operation fails, THEN the system SHALL display an error message and provide an alternative.

### Requirement 3

**User Story:** As a user, I want to see the correct SHA256 hash values to verify data integrity.

#### Acceptance Criteria

1.  WHEN the system generates a hash value, THEN it SHALL ensure the correct SHA256 algorithm is used.
2.  WHEN displaying a hash value, THEN it SHALL display the full 64-character hexadecimal string.
3.  WHEN a hash value is too short or incorrectly formatted, THEN the system SHALL recalculate it or display an error message.
4.  WHEN validating a hash value, THEN the system SHALL provide detailed information about the original data and the calculation process.

### Requirement 4

**User Story:** As a user, I want the main panel layout to be more rational for a better view of the network status and user information.

#### Acceptance Criteria

1.  WHEN displaying the main panel, THEN the system SHALL place the user area below the P2P network graph.
2.  WHEN displaying the network graph, THEN the system SHALL remove all DOM elements above the graph that take up vertical space.
3.  WHEN adjusting the network graph, THEN the system SHALL expand its width to 100%.
4.  WHEN redesigning the layout, THEN the system SHALL ensure all content displays correctly on different screen sizes.

### Requirement 5

**User Story:** As a user, I want the network graph to display all nodes to get a complete understanding of the network topology.

#### Acceptance Criteria

1.  WHEN displaying the network graph, THEN the system SHALL display all configured network nodes.
2.  WHEN there are many nodes, THEN the system SHALL use an appropriate layout algorithm to ensure all nodes are visible.
3.  WHEN node connections change, THEN the system SHALL update the connection status in the network graph in real-time.
4.  WHEN there is insufficient space in the network graph, THEN the system SHALL provide zoom or scroll functionality to view all nodes.

### Requirement 6

**User Story:** As a user, I want the network graph to correctly display connections between nodes to understand the complete network topology.

#### Acceptance Criteria

1.  WHEN the system starts, THEN the network graph SHALL display all nodes and the connections (edges) between them.
2.  WHEN nodes establish a connection, THEN the system SHALL draw a connecting line in the network graph.
3.  WHEN a connection is broken, THEN the system SHALL remove the corresponding connecting line from the network graph.
4.  WHEN the network status changes, THEN the system SHALL only update the changed connections, not redraw the entire graph.

### Requirement 7

**User Story:** As a user, I want only the changed parts of the interface to be redrawn for better performance and user experience.

#### Acceptance Criteria

1.  WHEN a user's status changes, THEN the system SHALL only update that user's display area.
2.  WHEN a blockchain's status changes, THEN the system SHALL only update that blockchain's display area.
3.  WHEN a network connection's status changes, THEN the system SHALL only update the relevant connecting lines, not redraw the entire graph.
4.  WHEN data is updated, THEN the system SHALL avoid global repaints and use an incremental update strategy.

### Requirement 8

**User Story:** As a user, I want the logs to be correctly ordered by time to track the sequence of events.

#### Acceptance Criteria

1.  WHEN a new log is generated, THEN the system SHALL add it to the bottom of the log list.
2.  WHEN displaying the log list, THEN the system SHALL arrange it chronologically from top to bottom (oldest at the top, newest at the bottom).
3.  WHEN the log list is updated, THEN the system SHALL automatically scroll to the newest log entry.
4.  WHEN the user manually scrolls the logs, THEN the system SHALL pause the auto-scrolling feature.

### Requirement 9

**User Story:** As a user, I want the log display to be more compact and readable to view more information in a limited space.

#### Acceptance Criteria

1.  WHEN displaying a log entry, THEN the system SHALL show the timestamp and the log message on the same line.
2.  WHEN setting the log background color, THEN the system SHALL use a lighter background color for better readability.
3.  WHEN displaying the log time, THEN the system SHALL use a compact time format that does not occupy a separate line.
4.  WHEN there are too many log entries, THEN the system SHALL reduce the vertical height of each log entry to display more content.

### Requirement 10

**User Story:** As a user, I want the interface to be more responsive for a better interactive experience.

#### Acceptance Criteria

1.  WHEN the user interacts with the interface, THEN the system SHALL respond to the user's action within 200 milliseconds.
2.  WHEN displaying a floating window, THEN the system SHALL use a smooth animation transition effect.
3.  WHEN updating the network graph, THEN the system SHALL use incremental updates instead of a full repaint.
4.  WHEN handling large amounts of data, THEN the system SHALL use virtualization techniques to keep the interface smooth.
