# iOS App Integration Guide

This guide outlines the necessary steps for integrating the Evo Exchange API into your iOS application.

## Overview

The Evo Exchange platform provides a comprehensive API for cryptocurrency trading, account management, and real-time notifications. This guide focuses on the iOS-specific aspects of integration.

## Requirements

- iOS 14.0 or higher
- Swift 5.0 or higher
- Xcode 13.0 or higher
- An active Evo Exchange account

## API Authentication

All API requests must include authentication credentials. The iOS app uses a combination of:

1. Cookie-based session authentication
2. Platform-specific headers for feature access

### Login

```swift
func login(username: String, password: String, completion: @escaping (Result<LoginResponse, Error>) -> Void) {
    guard let url = URL(string: "https://api.evoessence.exchange/api/auth/login") else { return }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue("iOS", forHTTPHeaderField: "X-App-Platform")
    request.addValue(UIDevice.current.systemVersion, forHTTPHeaderField: "X-App-Version")
    
    let body: [String: Any] = [
        "username": username,
        "password": password
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    // Create a URLSession task
    let task = URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }
    
    task.resume()
}
```

### Session Storage

Store the session cookie securely using Keychain:

```swift
func saveSessionCookie(cookie: HTTPCookie) {
    // Convert cookie to data for secure storage
    if let cookieProps = cookie.properties {
        KeychainService.save(key: "sessionCookie", data: cookieProps)
    }
}

func loadSessionCookie() -> HTTPCookie? {
    guard let cookieProps = KeychainService.load(key: "sessionCookie") as? [HTTPCookiePropertyKey: Any],
          let cookie = HTTPCookie(properties: cookieProps) else {
        return nil
    }
    
    return cookie
}
```

## Device Registration

Register the device with the server to enable push notifications and device management:

```swift
func registerDevice() {
    guard let deviceId = UIDevice.current.identifierForVendor?.uuidString else { return }
    
    let deviceInfo: [String: Any] = [
        "deviceId": deviceId,
        "deviceName": UIDevice.current.name,
        "deviceModel": getDeviceModel(),
        "osVersion": UIDevice.current.systemVersion
    ]
    
    // Call the API endpoint
    callAPI(endpoint: "/api/user-devices/register", method: "POST", body: deviceInfo) { result in
        // Handle result
    }
}

func getDeviceModel() -> String {
    var systemInfo = utsname()
    uname(&systemInfo)
    let machineMirror = Mirror(reflecting: systemInfo.machine)
    let identifier = machineMirror.children.reduce("") { identifier, element in
        guard let value = element.value as? Int8, value != 0 else { return identifier }
        return identifier + String(UnicodeScalar(UInt8(value)))
    }
    return identifier
}
```

## Push Notifications

The Evo Exchange API supports Apple Push Notification service (APNs) for delivering real-time updates.

### Step 1: Request Permission

```swift
func requestPushNotificationPermission() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
        DispatchQueue.main.async {
            if granted {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }
}
```

### Step 2: Register Device Token

```swift
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    updatePushToken(token: tokenString)
}

func updatePushToken(token: String) {
    guard let deviceId = UIDevice.current.identifierForVendor?.uuidString else { return }
    
    let tokenInfo: [String: Any] = [
        "deviceToken": token,
        "deviceId": deviceId
    ]
    
    callAPI(endpoint: "/api/push-notifications/update-token", method: "POST", body: tokenInfo) { result in
        // Handle result
    }
}
```

### Step 3: Handle Incoming Notifications

```swift
func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo
    
    // Check notification type
    if let type = userInfo["type"] as? String {
        switch type {
        case "transaction":
            // Handle transaction notification
            if let transactionId = userInfo["transactionId"] as? String {
                navigateToTransaction(id: transactionId)
            }
        case "price_alert":
            // Handle price alert
            if let currency = userInfo["currency"] as? String {
                navigateToPriceChart(currency: currency)
            }
        case "security":
            // Handle security alert
            navigateToSecuritySettings()
        default:
            break
        }
    }
    
    completionHandler()
}
```

## WebSocket Connection

For real-time data updates, the Evo Exchange platform provides WebSocket connectivity:

```swift
func connectToWebSocket() {
    // Get WebSocket token
    callAPI(endpoint: "/api/websocket/token", method: "GET") { [weak self] result in
        switch result {
        case .success(let data):
            guard let token = data["token"] as? String else { return }
            self?.establishWebSocketConnection(token: token)
        case .failure(let error):
            print("Failed to get WebSocket token: \(error)")
        }
    }
}

func establishWebSocketConnection(token: String) {
    guard let deviceId = UIDevice.current.identifierForVendor?.uuidString else { return }
    
    // Create WebSocket URL with token and device ID
    guard let url = URL(string: "wss://api.evoessence.exchange/ws?token=\(token)&deviceId=\(deviceId)&platform=iOS") else { return }
    
    let webSocketTask = URLSession.shared.webSocketTask(with: url)
    webSocketTask.resume()
    
    // Set up message reception
    receiveMessages(webSocketTask: webSocketTask)
}

func receiveMessages(webSocketTask: URLSessionWebSocketTask) {
    webSocketTask.receive { [weak self] result in
        switch result {
        case .success(let message):
            switch message {
            case .string(let text):
                self?.handleWebSocketMessage(text)
            case .data(let data):
                if let text = String(data: data, encoding: .utf8) {
                    self?.handleWebSocketMessage(text)
                }
            @unknown default:
                break
            }
            // Continue receiving messages
            self?.receiveMessages(webSocketTask: webSocketTask)
        case .failure(let error):
            print("WebSocket error: \(error)")
            // Handle reconnection
        }
    }
}

func handleWebSocketMessage(_ message: String) {
    guard let data = message.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        return
    }
    
    // Process different message types
    if let type = json["type"] as? String {
        switch type {
        case "price_update":
            updatePriceDisplay(json)
        case "transaction_update":
            updateTransactionStatus(json)
        case "balance_update":
            updateWalletBalance(json)
        default:
            break
        }
    }
}
```

## Market Data

Fetch cryptocurrency market data:

```swift
func fetchMarketPrices(completion: @escaping (Result<[CryptoCurrency], Error>) -> Void) {
    callAPI(endpoint: "/api/market/prices", method: "GET") { result in
        // Parse and return market data
    }
}
```

## Trading

Execute cryptocurrency trades:

```swift
func executeTrade(currency: String, amount: Double, action: TradeAction, completion: @escaping (Result<TradeResult, Error>) -> Void) {
    let tradeInfo: [String: Any] = [
        "currency": currency,
        "amount": amount,
        "action": action.rawValue
    ]
    
    callAPI(endpoint: "/api/trade/execute", method: "POST", body: tradeInfo) { result in
        // Handle trade result
    }
}
```

## Header Requirements

All API requests from iOS should include the following headers:

```swift
request.addValue("iOS", forHTTPHeaderField: "X-App-Platform")
request.addValue(UIDevice.current.systemVersion, forHTTPHeaderField: "X-App-Version")
request.addValue(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "", forHTTPHeaderField: "X-App-Build")
```

## Error Handling

Implement proper error handling for API responses:

```swift
enum APIError: Error {
    case networkError(Error)
    case invalidResponse
    case invalidData
    case authenticationError
    case serverError(String)
    case unknownError
}

func handleAPIError(_ data: Data?) -> APIError {
    guard let data = data,
          let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) else {
        return .unknownError
    }
    
    switch errorResponse.code {
    case "AUTH_REQUIRED":
        return .authenticationError
    default:
        return .serverError(errorResponse.message)
    }
}
```

## Security Considerations

1. **Use HTTPS**: Always use secure connections for all API communications.
2. **Store Tokens Securely**: Use Keychain for storing authentication tokens.
3. **Implement Certificate Pinning**: To prevent man-in-the-middle attacks.
4. **Validate API Responses**: Always check response validity before processing data.
5. **Implement Jailbreak Detection**: Restrict app functionality on jailbroken devices.

## Certificate Pinning Example

```swift
class CustomURLSessionDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard let serverTrust = challenge.protectionSpace.serverTrust,
              let certificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Get local certificate data
        guard let localCertificatePath = Bundle.main.path(forResource: "certificate", ofType: "der"),
              let localCertificateData = try? Data(contentsOf: URL(fileURLWithPath: localCertificatePath)) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Get server certificate data
        let serverCertificateData = SecCertificateCopyData(certificate) as Data
        
        if serverCertificateData == localCertificateData {
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

## Additional Resources

- [API Documentation](https://api.evoessence.exchange/docs)
- [Swift SDK Repository](https://github.com/evoessence/swift-sdk)
- [Sample App GitHub Repository](https://github.com/evoessence/ios-demo-app)