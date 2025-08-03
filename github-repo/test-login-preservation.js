/**
 * This script tests login and session status checking
 * to verify boolean value preservation in the passport deserialization flow
 */

import axios from 'axios';
import { promisify } from 'util';
const sleep = promisify(setTimeout);

async function testLoginFlow() {
  try {
    console.log('Starting login test to verify boolean value preservation');
    
    // Attempt to login as admin
    console.log('Attempting admin login...');
    const loginResponse = await axios.post('http://localhost:5000/bypass/auth/login', {
      username: 'admin',
      password: 'Adm1nqdU2017'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('Login response:', {
      status: loginResponse.status,
      data: {
        id: loginResponse.data.id,
        username: loginResponse.data.username,
        isAdmin: loginResponse.data.isAdmin,
        isAdmin_type: typeof loginResponse.data.isAdmin,
        isEmployee: loginResponse.data.isEmployee,
        isEmployee_type: typeof loginResponse.data.isEmployee,
        userGroup: loginResponse.data.userGroup
      }
    });
    
    // Save cookies from the response
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies returned from login request!');
    }
    
    console.log('Session cookie received');
    
    // Wait a second for session to be fully established
    await sleep(1000);
    
    // Now check the user status with cookies
    console.log('Checking user session state...');
    const userResponse = await axios.get('http://localhost:5000/bypass/user', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      withCredentials: true
    });
    
    console.log('User session response:', {
      status: userResponse.status,
      data: {
        id: userResponse.data.id,
        username: userResponse.data.username,
        isAdmin: userResponse.data.isAdmin,
        isEmployee: userResponse.data.isEmployee,
        userGroup: userResponse.data.userGroup
      }
    });
    
    // Verify boolean values are preserved
    if (typeof userResponse.data.isAdmin === 'boolean' && 
        typeof userResponse.data.isEmployee === 'boolean') {
      console.log('SUCCESS! Boolean values are preserved through deserialization!');
    } else {
      console.error('FAILURE: Boolean values are not properly preserved');
      console.error(`isAdmin: ${typeof userResponse.data.isAdmin} (${userResponse.data.isAdmin})`);
      console.error(`isEmployee: ${typeof userResponse.data.isEmployee} (${userResponse.data.isEmployee})`);
    }
    
    return {
      success: true,
      message: 'Login flow completed successfully'
    };
  } catch (error) {
    console.error('Error during login test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return {
      success: false,
      message: error.message
    };
  }
}

// Execute the test
try {
  const result = await testLoginFlow();
  console.log('Test completed:', result);
  // In ESM modules, we need to use a different approach to exit
  if (!result.success) {
    console.error('Test failed');
    // Use a non-zero exit code to indicate failure
    process.exit(1);
  }
} catch (err) {
  console.error('Test failed with error:', err);
  process.exit(1);
}