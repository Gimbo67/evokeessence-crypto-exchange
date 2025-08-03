# iOS Push Notification Integration Guide

This guide provides instructions for integrating push notifications in your iOS app with the Evo Exchange backend.

## Prerequisites

1. Your iOS app must be registered with Apple Developer and have push notification capability enabled
2. You need to have a valid `.p8` key file for APNs (Apple Push Notification service)
3. You need to know your Team ID and Key ID from Apple Developer

## Server Configuration

The server is already configured to handle push notifications using the APNs provider. The following environment variables must be set:

- `APK_P8_KEY`: The contents of your `.p8` key file
- `TEAM_ID`: Your Apple Developer Team ID
- `KEY_ID`: Your APNs Key ID

## API Endpoints

The following API endpoints are available for managing push notifications:

### Update Push Token

```
POST /api/push-notifications/update-token
```

**Headers:**
- `Authorization`: Bearer token for authentication
- `X-App-Platform`: "iOS" (required to identify the device platform)

**Request Body:**
```json
{
  "deviceToken": "your-device-token-from-apns",
  "deviceId": "unique-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push notification token updated successfully"
}
```

### Toggle Push Notifications

```
POST /api/push-notifications/toggle
```

**Headers:**
- `Authorization`: Bearer token for authentication

**Request Body:**
```json
{
  "enabled": true,
  "deviceId": "unique-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push notifications enabled successfully"
}
```

### Get Notification Settings

```
GET /api/push-notifications/settings
```

**Headers:**
- `Authorization`: Bearer token for authentication

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "device-uuid-1",
      "deviceName": "iPhone 15 Pro",
      "deviceOs": "iOS",
      "notificationsEnabled": true,
      "hasPushToken": true
    },
    {
      "deviceId": "device-uuid-2",
      "deviceName": "iPad Pro",
      "deviceOs": "iOS",
      "notificationsEnabled": false,
      "hasPushToken": true
    }
  ]
}
```

### Send Test Notification

```
POST /api/push-notifications/test
```

**Headers:**
- `Authorization`: Bearer token for authentication
- `X-App-Platform`: "iOS" (required to identify the device platform)

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully to 1 device(s)",
  "sent": 1,
  "failed": 0
}
```

## iOS App Implementation

### Step 1: Request Push Notification Permission

```swift
import UserNotifications

func registerForPushNotifications() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
        print("Permission granted: \(granted)")
        
        guard granted else { return }
        
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}
```

### Step 2: Handle Device Token

```swift
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("Device Token: \(token)")
    
    // Send this token to the server
    updatePushToken(token: token)
}

func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register for notifications: \(error)")
}
```

### Step 3: Send Device Token to Server

```swift
func updatePushToken(token: String) {
    guard let deviceId = UIDevice.current.identifierForVendor?.uuidString else { return }
    
    let url = URL(string: "https://api.evoessence.exchange/api/push-notifications/update-token")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.addValue("iOS", forHTTPHeaderField: "X-App-Platform")
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = [
        "deviceToken": token,
        "deviceId": deviceId
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }.resume()
}
```

### Step 4: Handle Incoming Notifications

```swift
func userNotificationCenter(_ center: UNUserNotificationCenter, 
                            willPresent notification: UNNotification, 
                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    // Show notification when app is in foreground
    completionHandler([.banner, .sound, .badge])
}

func userNotificationCenter(_ center: UNUserNotificationCenter, 
                            didReceive response: UNNotificationResponse, 
                            withCompletionHandler completionHandler: @escaping () -> Void) {
    // Handle notification tap
    let userInfo = response.notification.request.content.userInfo
    
    if let type = userInfo["type"] as? String {
        switch type {
        case "transaction":
            // Navigate to transaction details
            if let transactionId = userInfo["transactionId"] as? String {
                navigateToTransaction(id: transactionId)
            }
        case "price_alert":
            // Navigate to price chart
            if let currency = userInfo["currency"] as? String {
                navigateToPriceChart(currency: currency)
            }
        case "security":
            // Navigate to security settings
            navigateToSecuritySettings()
        default:
            break
        }
    }
    
    completionHandler()
}
```

### Step 5: Toggle Push Notifications

```swift
func togglePushNotifications(enabled: Bool) {
    guard let deviceId = UIDevice.current.identifierForVendor?.uuidString else { return }
    
    let url = URL(string: "https://api.evoessence.exchange/api/push-notifications/toggle")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = [
        "enabled": enabled,
        "deviceId": deviceId
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }.resume()
}
```

## Notification Categories

The server sends different types of notifications:

1. **Transaction Notifications**: Updates about crypto transactions
2. **Price Alert Notifications**: Alerts when a cryptocurrency reaches a target price
3. **Security Notifications**: Security-related alerts (login attempts, password changes, etc.)

## Testing Notifications

To test push notifications:

1. Ensure your device is registered with the server
2. Make sure push notifications are enabled for your device
3. Call the test endpoint:

```swift
func sendTestNotification() {
    let url = URL(string: "https://api.evoessence.exchange/api/push-notifications/test")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.addValue("iOS", forHTTPHeaderField: "X-App-Platform")
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }.resume()
}
```

## Troubleshooting

If push notifications are not working:

1. Verify that you have requested and received permission for push notifications
2. Check that your device token is correctly sent to the server
3. Ensure that your device has notifications enabled in the app settings
4. Verify that your device has an active internet connection
5. Check the server logs for any errors related to push notifications

For any issues, contact the Evo Exchange development team.