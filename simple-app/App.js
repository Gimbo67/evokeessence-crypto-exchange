import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState('home');
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [messages, setMessages] = useState([]);
  const webSocketRef = useRef(null);

  // Function to establish WebSocket connection
  const connectWebSocket = () => {
    try {
      // This is a placeholder - in your production app, you'd get a token from your authentication API
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMzQsInNlc3Npb25JZCI6ImFiY2RlZiIsInRpbWVzdGFtcCI6MTYyMDAwMDAwMH0.Mocked_Token_Signature';
      
      // Device info for the connection
      const deviceInfo = {
        model: 'iPhone15,2',  // iPhone 14 Pro
        os: 'iOS',
        osVersion: '17.4',
        appVersion: '1.0.0',
        deviceId: 'ios-device-' + Math.random().toString(36).substring(7),
      };

      // In production, this would be your actual server URL - for demo we use a placeholder
      const serverUrl = 'wss://your-server-url.com/ws';
      const wsUrl = `${serverUrl}?token=${mockToken}&platform=ios&version=${deviceInfo.appVersion}&device=${encodeURIComponent(deviceInfo.model)}`;
      
      setConnectionStatus('Connecting...');
      addMessage('System', 'Connecting to server...');

      // Create a mock WebSocket for the demo
      // In production, this would be: const ws = new WebSocket(wsUrl);
      const mockWebSocket = {
        readyState: 1, // WebSocket.OPEN
        send: (message) => {
          console.log('Message sent:', message);
          // Simulate response after sending
          setTimeout(() => {
            const response = {
              type: 'pong',
              timestamp: new Date().toISOString()
            };
            mockWebSocket.onmessage({ data: JSON.stringify(response) });
          }, 500);
        },
        close: () => {
          mockWebSocket.onclose({ code: 1000, reason: 'Closed by user' });
        }
      };
      
      // Set mock handlers for demo
      setTimeout(() => {
        mockWebSocket.onopen();
        
        // Simulate balance update after 5 seconds
        setTimeout(() => {
          const balanceUpdate = {
            type: 'balanceUpdated',
            userId: 1234,
            data: {
              currency: 'BTC',
              balance: 0.05432,
              previous: 0.05,
              updatedAt: new Date().toISOString()
            }
          };
          mockWebSocket.onmessage({ data: JSON.stringify(balanceUpdate) });
        }, 5000);
        
        // Simulate KYC status update after 10 seconds
        setTimeout(() => {
          const kycUpdate = {
            type: 'kycStatusChanged',
            userId: 1234,
            data: {
              status: 'verified',
              updatedAt: new Date().toISOString()
            }
          };
          mockWebSocket.onmessage({ data: JSON.stringify(kycUpdate) });
        }, 10000);
      }, 1000);
      
      webSocketRef.current = mockWebSocket;
      
      // Define handlers
      mockWebSocket.onopen = () => {
        setConnected(true);
        setConnectionStatus('Connected');
        addMessage('System', 'Connection established');
        
        // Start ping interval
        startPingInterval();
      };
      
      mockWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addMessage('Server', JSON.stringify(data));
          
          // Handle different message types
          handleMessage(data);
        } catch (error) {
          addMessage('Error', 'Failed to parse message: ' + error.message);
        }
      };
      
      mockWebSocket.onerror = (error) => {
        addMessage('Error', 'Connection error');
        setConnectionStatus('Error');
      };
      
      mockWebSocket.onclose = (event) => {
        setConnected(false);
        setConnectionStatus('Disconnected: ' + event.code);
        addMessage('System', 'Connection closed: ' + event.reason);
        
        if (webSocketRef.current && webSocketRef.current.pingInterval) {
          clearInterval(webSocketRef.current.pingInterval);
        }
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
      if (webSocketRef.current && webSocketRef.current.readyState === 1) { // WebSocket.OPEN
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
    if (webSocketRef.current) {
      webSocketRef.current.pingInterval = interval;
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EvokeEssence</Text>
        {screen === 'websocket' && (
          <Text style={[
            styles.statusText, 
            connected ? styles.connectedStatus : styles.disconnectedStatus
          ]}>
            {connectionStatus}
          </Text>
        )}
      </View>
      
      <ScrollView style={styles.content}>
        {screen === 'home' && (
          <View style={styles.homeScreen}>
            <Text style={styles.welcomeText}>Welcome to EvokeEssence</Text>
            <Text style={styles.subtitleText}>Your premier crypto exchange platform</Text>
            
            <View style={styles.featuresContainer}>
              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Easy Trading</Text>
                <Text style={styles.featureDesc}>Trade cryptocurrencies with a simple and intuitive interface</Text>
              </View>
              
              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Secure Storage</Text>
                <Text style={styles.featureDesc}>Your assets are secured with industry-leading protection</Text>
              </View>
              
              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Real-time Updates</Text>
                <Text style={styles.featureDesc}>Get the latest market prices and wallet updates instantly</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setScreen('market')}
            >
              <Text style={styles.buttonText}>View Markets</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, {backgroundColor: '#4CAF50'}]}
              onPress={() => setScreen('websocket')}
            >
              <Text style={styles.buttonText}>Real-time Updates Demo</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {screen === 'market' && (
          <View style={styles.marketScreen}>
            <Text style={styles.screenTitle}>Cryptocurrency Market</Text>
            
            <View style={styles.marketItem}>
              <Text style={styles.coinName}>Bitcoin (BTC)</Text>
              <Text style={styles.coinPrice}>$59,245.32</Text>
              <Text style={styles.coinChange}>+2.4%</Text>
            </View>
            
            <View style={styles.marketItem}>
              <Text style={styles.coinName}>Ethereum (ETH)</Text>
              <Text style={styles.coinPrice}>$3,127.58</Text>
              <Text style={styles.coinChange}>+1.8%</Text>
            </View>
            
            <View style={styles.marketItem}>
              <Text style={styles.coinName}>Binance Coin (BNB)</Text>
              <Text style={styles.coinPrice}>$618.19</Text>
              <Text style={styles.coinChange}>-0.3%</Text>
            </View>
            
            <View style={styles.marketItem}>
              <Text style={styles.coinName}>XRP (XRP)</Text>
              <Text style={styles.coinPrice}>$0.5842</Text>
              <Text style={styles.coinChange}>+3.2%</Text>
            </View>
            
            <View style={styles.marketItem}>
              <Text style={styles.coinName}>Cardano (ADA)</Text>
              <Text style={styles.coinPrice}>$0.4921</Text>
              <Text style={styles.coinChange}>+0.7%</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setScreen('home')}
            >
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {screen === 'websocket' && (
          <View style={styles.websocketScreen}>
            <Text style={styles.screenTitle}>Real-time Updates</Text>
            <Text style={styles.websocketDesc}>
              The EvokeEssence iOS app uses WebSockets to provide instant notifications 
              for balance changes, verification status updates, and market movements.
            </Text>
            
            <View style={styles.messagesContainer}>
              <Text style={styles.messagesTitle}>Connection Log:</Text>
              
              {messages.map((msg, index) => (
                <View key={index} style={styles.messageItem}>
                  <Text style={styles.messageSender}>{msg.sender}:</Text>
                  <Text style={styles.messageText}>{msg.text}</Text>
                  <Text style={styles.messageTimestamp}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
              
              {messages.length === 0 && (
                <Text style={styles.noMessagesText}>No messages yet. Connect to the server to see real-time updates.</Text>
              )}
            </View>
            
            {!connected ? (
              <TouchableOpacity 
                style={styles.connectButton}
                onPress={connectWebSocket}
              >
                <Text style={styles.buttonText}>Connect to Server</Text>
              </TouchableOpacity>
            ) : (
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
            )}
            
            <TouchableOpacity 
              style={[styles.button, {marginTop: 20}]}
              onPress={() => setScreen('home')}
            >
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerTab} onPress={() => setScreen('home')}>
          <Text style={[styles.footerText, screen === 'home' && styles.activeTab]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => setScreen('market')}>
          <Text style={[styles.footerText, screen === 'market' && styles.activeTab]}>Markets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => setScreen('websocket')}>
          <Text style={[styles.footerText, screen === 'websocket' && styles.activeTab]}>Real-time</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab}>
          <Text style={styles.footerText}>Profile</Text>
        </TouchableOpacity>
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
    paddingVertical: 15,
    paddingHorizontal: 20,
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
  content: {
    flex: 1,
  },
  homeScreen: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
  },
  featuresContainer: {
    marginVertical: 20,
  },
  featureCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#0066FF',
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#0066FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  marketScreen: {
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  marketItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 2,
  },
  coinPrice: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  coinChange: {
    fontSize: 14,
    color: 'green',
    flex: 1,
    textAlign: 'right',
  },
  websocketScreen: {
    padding: 20,
  },
  websocketDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  messagesContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    maxHeight: 300,
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  messageItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eeeeee',
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
  noMessagesText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#f9f9f9',
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  activeTab: {
    color: '#0066FF',
    fontWeight: 'bold',
  },
});