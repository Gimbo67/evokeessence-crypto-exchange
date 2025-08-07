/**
 * Test script to verify employee middleware functions are working properly
 * This script simulates authentication with different user types to verify middleware behavior
 */
import axios from 'axios';

async function testEmployeeMiddleware() {
  console.log('Testing employee middleware functions...');

  // 1. Set up test credentials - adjust these as needed
  const adminCredentials = {
    username: 'admin',
    password: 'Adm1nqdU2017' // From your specified admin password
  };

  const employeeCredentials = {
    username: 'testemployee',  // Created by test-employee-login.js
    password: 'employee123'
  };

  const regularUserCredentials = {
    username: 'regular_user',  // Assuming this user exists
    password: 'UserPass1234!'
  };

  // 2. Test admin login
  console.log('\nTesting admin authentication...');
  const adminSession = await login(adminCredentials);
  
  if (adminSession.success) {
    console.log('Admin login successful');
    console.log('Testing admin access to protected routes:');
    
    // Test employee dashboard route with admin
    await testProtectedRoute(
      '/bypass/employee/dashboard/stats', 
      adminSession.cookie,
      'Employee dashboard stats (as admin)'
    );
  } else {
    console.log('Admin login failed:', adminSession.message);
  }

  // 3. Test employee login
  console.log('\nTesting employee authentication...');
  const employeeSession = await login(employeeCredentials);
  
  if (employeeSession.success) {
    console.log('Employee login successful');
    console.log('Testing employee access to protected routes:');
    
    // Test employee dashboard route
    await testProtectedRoute(
      '/bypass/employee/dashboard/stats', 
      employeeSession.cookie,
      'Employee dashboard stats (as employee)'
    );
  } else {
    console.log('Employee login failed:', employeeSession.message);
  }

  // 4. Test regular user login
  console.log('\nTesting regular user authentication...');
  const regularUserSession = await login(regularUserCredentials);
  
  if (regularUserSession.success) {
    console.log('Regular user login successful');
    console.log('Testing regular user access to protected routes (should fail):');
    
    // Test employee dashboard route with regular user (should fail)
    await testProtectedRoute(
      '/bypass/employee/dashboard/stats', 
      regularUserSession.cookie,
      'Employee dashboard stats (as regular user - should fail)'
    );
  } else {
    console.log('Regular user login failed:', regularUserSession.message);
  }

  console.log('\nMiddleware testing complete.');
}

async function login(credentials) {
  try {
    const response = await axios.post('http://localhost:5000/bypass/auth/login', credentials, {
      validateStatus: () => true
    });
    
    if (response.status === 200 && response.data.authenticated) {
      // Extract the cookie from the response
      const cookies = response.headers['set-cookie'];
      if (!cookies || cookies.length === 0) {
        return { success: false, message: 'No session cookie returned' };
      }
      
      const sessionCookie = cookies[0].split(';')[0];
      return { 
        success: true, 
        user: response.data.user,
        cookie: sessionCookie
      };
    } else {
      return { 
        success: false, 
        message: response.data.message || 'Authentication failed'
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error.message
    };
  }
}

async function testProtectedRoute(route, cookie, description) {
  try {
    const response = await axios.get(`http://localhost:5000${route}`, {
      headers: {
        Cookie: cookie
      },
      validateStatus: () => true
    });
    
    console.log(`- ${description}: ${response.status === 200 ? 'SUCCESS' : 'FAILED'} (${response.status})`);
    
    // Log detailed info for debugging
    if (response.status !== 200) {
      console.log(`  Error: ${response.data.message || 'Unknown error'}`);
    } else {
      console.log(`  Success: Data received (${Object.keys(response.data).length} keys)`);
    }
  } catch (error) {
    console.log(`- ${description}: ERROR - ${error.message}`);
  }
}

// Run the test
testEmployeeMiddleware().catch(error => {
  console.error('Test failed with error:', error.message);
});

// Export for using as module
export { testEmployeeMiddleware, login, testProtectedRoute };