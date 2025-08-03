/**
 * Test script to verify proper handling of boolean values from PostgreSQL
 * This script logs in as an admin user and verifies that the isAdmin and isEmployee properties
 * are correctly converted from PostgreSQL 't'/'f' values to JavaScript booleans
 */

import axios from 'axios';

async function testLogin() {
  try {
    console.log('Starting login test...');
    
    // Attempt to login as admin
    const response = await axios.post('http://localhost:5001/bypass/auth/login', {
      username: 'admin',
      password: 'Adm1nqdU2017'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('Login response status:', response.status);
    console.log('Login response data:', JSON.stringify(response.data, null, 2));
    
    // Check if isAdmin and isEmployee are properly converted to booleans
    console.log('\nBoolean value verification:');
    console.log('- isAdmin:', response.data.isAdmin);
    console.log('- isAdmin type:', typeof response.data.isAdmin);
    console.log('- isEmployee:', response.data.isEmployee);
    console.log('- isEmployee type:', typeof response.data.isEmployee);
    
    // Now get the user data with another request
    const userResponse = await axios.get('http://localhost:5001/bypass/user', {
      headers: {
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('\nUser data response status:', userResponse.status);
    console.log('User data response:', JSON.stringify(userResponse.data, null, 2));
    
    console.log('\nUser data boolean value verification:');
    console.log('- isAdmin:', userResponse.data.isAdmin);
    console.log('- isAdmin type:', typeof userResponse.data.isAdmin);
    console.log('- isEmployee:', userResponse.data.isEmployee);
    console.log('- isEmployee type:', typeof userResponse.data.isEmployee);
    console.log('- twoFactorEnabled:', userResponse.data.twoFactorEnabled);
    console.log('- twoFactorEnabled type:', typeof userResponse.data.twoFactorEnabled);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testLogin();