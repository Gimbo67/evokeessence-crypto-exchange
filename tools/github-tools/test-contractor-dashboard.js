/**
 * Test script to directly access and test the contractor dashboard
 * This bypasses the authentication flow to test the component directly
 */
import fs from 'fs';
import axios from 'axios';

async function loginAsContractor() {
  console.log("===== Logging in as contractor =====");
  try {
    const response = await axios.post('http://localhost:5000/bypass/auth/login', {
      username: 'testcontractor4',
      password: 'Test1234!',
      recaptchaToken: 'bypass-token'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log("Login response:", response.data);
    return response.headers['set-cookie'];
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    return null;
  }
}

async function getContractorAnalytics(cookies) {
  console.log("===== Getting contractor analytics =====");
  try {
    const response = await axios.get('http://localhost:5000/api/contractor/analytics', {
      headers: {
        Cookie: cookies.join('; ')
      }
    });

    console.log("Contractor analytics:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("Analytics error:", error.response?.data || error.message);
    return null;
  }
}

async function getContractorPage(cookies) {
  console.log("===== Testing contractor dashboard page access =====");
  try {
    const response = await axios.get('http://localhost:5000/contractor/dashboard', {
      headers: {
        Cookie: cookies.join('; ')
      }
    });

    console.log("Dashboard response status:", response.status);
    console.log("Dashboard response type:", typeof response.data);
    
    // Save the HTML response to see what's returned
    fs.writeFileSync('contractor-dashboard-response.html', response.data);
    console.log("Dashboard HTML response saved to contractor-dashboard-response.html");
    
    return true;
  } catch (error) {
    console.error("Dashboard error:", error.response?.status, error.response?.statusText);
    return false;
  }
}

async function runTest() {
  try {
    // 1. Login as contractor
    const cookies = await loginAsContractor();
    if (!cookies) {
      console.error("Failed to login as contractor");
      return;
    }

    // 2. Get analytics
    const analytics = await getContractorAnalytics(cookies);
    if (!analytics) {
      console.error("Failed to get contractor analytics");
    }

    // 3. Try to access the dashboard page
    await getContractorPage(cookies);

    console.log("===== Test completed =====");
  } catch (error) {
    console.error("Test error:", error);
  }
}

runTest();