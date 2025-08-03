import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function WebSocketExample() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const webSocketRef = useRef(null);

  // Function to establish WebSocket connection
  const connectWebSocket = (token) => {
    try {
      // This should match your server configuration
      const deviceInfo = {
        model: 'iPhone15,2',  // iPhone 14 Pro
        os: 'iOS',
        osVersion: '17.4',
        appVersion: '1.0.0',
        deviceId: 'ios-device-' + Math.random().toString(36).substring(7),
      };

      // Replace with your actual server URL
      const serverUrl = 'wss://your-server-url.com/ws';
      const wsUrl = `${serverUrl}?token=${token}&platform=ios&version=${deviceInfo.appVersion}&device=${encodeURIComponent(deviceInfo.model)}`;
      
      setConnectionStatus('Connecting...');

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      webSocketRef.current = ws;
      
      ws.onopen = () => {
        setConnected(true);
        setConnectionStatus('Connected');
        addMessage('System', 'Connection established');
        
        // Send initial message
        sendMessage('Hello from iOS app');
        
        // Start ping interval
        startPingInterval();
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addMessage('Server', JSON.stringify(data));
          
          // Handle different message types
          handleMessage(data);
        } catch (error) {
          addMessage('Error', 'Failed to parse message: ' + error.message);
        }
      };
      
      ws.onerror = (error) => {
        addMessage('Error', 'Connection error');
        setConnectionStatus('Error: ' + error.message);
      };
      
      ws.onclose = (event) => {
        setConnected(false);
        setConnectionStatus('Disconnected: ' + event.code);
        addMessage('System', 'Connection closed: ' + event.reason);
      };
    } catch (error) {
      Alert.alert('Connection Error', error.message);
    }
  };
  
  // Handle different message types from the server
  const handleMessage = (data) => {
    switch (data.type) {
      case 'balanceUpdated':
        // Handle balance updates
        Alert.alert('Balance Updated', 
          `Your ${data.data.currency} balance has been updated to ${data.data.balance}`);
        break;
        
      case 'kycStatusChanged':
        // Handle KYC status changes
        Alert.alert('Verification Status Updated', 
          `Your verification status is now: ${data.data.status}`);
        break;
        
      case 'depositStatusChanged':
        // Handle deposit status changes
        Alert.alert('Deposit Status Updated', 
          `Your deposit of ${data.data.amount} ${data.data.currency} is now ${data.data.status}`);
        break;
        
      case 'serverNotification':
        // Handle general server notifications
        Alert.alert(data.data.title, data.data.message);
        break;
        
      case 'pong':
        // Handle pong response (keep connection alive)
        console.log('Received pong from server');
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };
  
  // Start ping interval to keep connection alive
  const startPingInterval = () => {
    const interval = setInterval(() => {
      if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
        const pingMessage = JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
        webSocketRef.current.send(pingMessage);
        addMessage('Client', 'Ping sent');
      } else {
        clearInterval(interval);
      }
    }, 15000); // Send ping every 15 seconds
    
    // Store interval ID for cleanup
    webSocketRef.current.pingInterval = interval;
  };
  
  // Send a message to the server
  const sendMessage = (text) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'message',
        text: text,
        timestamp: new Date().toISOString()
      });
      webSocketRef.current.send(message);
      addMessage('Client', text);
    } else {
      Alert.alert('Error', 'WebSocket is not connected');
    }
  };
  
  // Add a message to the messages list
  const addMessage = (sender, text) => {
    const timestamp = new Date().toISOString();
    setMessages(prevMessages => [
      ...prevMessages, 
      { sender, text, timestamp }
    ]);
  };
  
  // Clean up WebSocket connection on component unmount
  useEffect(() => {
    return () => {
      if (webSocketRef.current) {
        if (webSocketRef.current.pingInterval) {
          clearInterval(webSocketRef.current.pingInterval);
        }
        webSocketRef.current.close();
      }
    };
  }, []);
  
  // Mock authentication function - in real app, this would call your server API
  const authenticateAndConnect = () => {
    // This would be the actual authentication flow in your app
    // For demo purposes, we're using a mock token
    setTimeout(() => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMzQsInNlc3Npb25JZCI6ImFiY2RlZiIsInRpbWVzdGFtcCI6MTYyMDAwMDAwMH0.Mocked_Token_Signature';
      connectWebSocket(mockToken);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WebSocket Demo</Text>
        <Text style={[
          styles.statusText, 
          connected ? styles.connectedStatus : styles.disconnectedStatus
        ]}>
          {connectionStatus}
        </Text>
      </View>
      
      <ScrollView style={styles.messagesContainer}>
        {messages.map((msg, index) => (
          <View key={index} style={styles.messageItem}>
            <Text style={styles.messageSender}>{msg.sender}:</Text>
            <Text style={styles.messageText}>{msg.text}</Text>
            <Text style={styles.messageTimestamp}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.footer}>
        {!connected ? (
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={authenticateAndConnect}
          >
            <Text style={styles.buttonText}>Connect to Server</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={() => sendMessage('Hello from iOS')}
            >
              <Text style={styles.buttonText}>Send Test Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.disconnectButton}
              onPress={() => {
                if (webSocketRef.current) {
                  webSocketRef.current.close();
                }
              }}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#0066FF',
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectedStatus: {
    color: '#4CAF50',
  },
  disconnectedStatus: {
    color: '#F44336',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  messageItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  messageSender: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 14,
    marginBottom: 5,
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    padding: 15,
  },
  connectButton: {
    backgroundColor: '#0066FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageButton: {
    backgroundColor: '#0066FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});