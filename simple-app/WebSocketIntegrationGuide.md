# EvokeEssence iOS App WebSocket Integration Guide

## Overview

This document provides a detailed guide for integrating real-time WebSocket communications between the EvokeEssence iOS app and the backend server.

## Server-Side Setup

1. The server has a WebSocket endpoint at `/ws` that accepts connections with authentication tokens
2. The WebSocket connection expects query parameters for device identification:
   - `token`: JWT authentication token from the login process
   - `platform`: Set to "ios" for the iOS app
   - `version`: The app version (e.g., "1.0.0")
   - `device`: The device model (e.g., "iPhone15,2")

## Message Types

The WebSocket implementation supports the following message types:

### From Server to Client:

1. **Balance Updates**
   ```json
   {
     "type": "balanceUpdated",
     "userId": 1234,
     "data": {
       "currency": "BTC",
       "balance": 0.05432,
       "previous": 0.05,
       "updatedAt": "2025-05-20T14:30:00Z"
     }
   }
   ```

2. **KYC Status Changes**
   ```json
   {
     "type": "kycStatusChanged",
     "userId": 1234,
     "data": {
       "status": "verified",
       "updatedAt": "2025-05-20T14:30:00Z"
     }
   }
   ```

3. **Deposit Status Updates**
   ```json
   {
     "type": "depositStatusChanged",
     "userId": 1234,
     "data": {
       "depositId": 5678,
       "status": "completed",
       "amount": 1000,
       "currency": "USDT",
       "updatedAt": "2025-05-20T14:30:00Z"
     }
   }
   ```

4. **Server Notifications**
   ```json
   {
     "type": "serverNotification",
     "data": {
       "title": "Maintenance Notice",
       "message": "Scheduled maintenance in 30 minutes",
       "severity": "info",
       "timestamp": "2025-05-20T14:30:00Z"
     }
   }
   ```

5. **Pong Responses**
   ```json
   {
     "type": "pong",
     "timestamp": "2025-05-20T14:30:00Z"
   }
   ```

### From Client to Server:

1. **Ping Messages** (for connection health checks)
   ```json
   {
     "type": "ping",
     "timestamp": "2025-05-20T14:30:00Z"
   }
   ```

2. **Custom Messages**
   ```json
   {
     "type": "message",
     "text": "Custom message content",
     "timestamp": "2025-05-20T14:30:00Z"
   }
   ```

## Authentication Flow

1. The iOS app authenticates with the server using the `/api/auth/login` endpoint
2. After successful authentication, the app requests a WebSocket token using the `/api/websocket/token` endpoint
3. The received token is used to establish a WebSocket connection

## Connection Management

1. **Connection Establishment**:
   - Create a WebSocket connection to the server endpoint with the required parameters
   - Handle the `onopen` event to track successful connections

2. **Health Checks**:
   - Send ping messages every 15 seconds to keep the connection alive
   - Handle pong responses from the server

3. **Error Handling**:
   - Implement reconnection logic for dropped connections
   - Add exponential backoff for connection attempts

4. **Clean Disconnection**:
   - Properly close the WebSocket when the app goes to the background
   - Clear any intervals or timers when disconnecting

## Implementation Notes

1. The WebSocket connection should be established after the user is authenticated
2. The connection should be maintained throughout the app session
3. Consider implementing a notification system to alert users of important updates even when not in the app
4. Handle reconnection automatically when the app returns from background state
5. Ensure proper error messaging to the user when connection issues occur

## Security Considerations

1. Always use secure WebSocket connections (WSS://) in production
2. Validate all incoming messages before processing
3. Implement token expiration and renewal mechanisms
4. Do not expose sensitive information in WebSocket communications

## iOS-Specific Implementation

In the iOS app, the WebSocket connection is managed through a service that:
- Maintains a singleton instance for app-wide access
- Handles authentication token management
- Provides methods for connection status observation
- Dispatches received messages to appropriate handlers