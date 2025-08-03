/**
 * Test script to verify employee login functionality
 * This script logs in with employee credentials and checks the response
 */

import axios from 'axios';

async function testEmployeeLogin() {
  try {
    console.log('Starting employee login test...');
    
    // Attempt login with employee credentials
    const loginResponse = await axios.post('http://localhost:5000/bypass/auth/login', {
      username: 'testemployee',
      password: 'employee123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', JSON.stringify(loginResponse.data, null, 2));
    
    // Check authentication status
    const authStatusResponse = await axios.get('http://localhost:5000/bypass/user', {
      withCredentials: true,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Auth status response status:', authStatusResponse.status);
    console.log('Auth status response data:', JSON.stringify(authStatusResponse.data, null, 2));
    
    // Verify is_employee or isEmployee flag is set
    const isEmployee = authStatusResponse.data?.isEmployee || authStatusResponse.data?.is_employee;
    console.log('isEmployee flag value:', isEmployee);
    
    // Check permissions
    try {
      const permissionsResponse = await axios.get('http://localhost:5000/bypass/employee/dashboard/permissions', {
        withCredentials: true,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Permissions response status:', permissionsResponse.status);
      console.log('Permissions response data:', JSON.stringify(permissionsResponse.data, null, 2));
    } catch (error) {
      console.error('Error fetching permissions:', error.response?.status, error.response?.data);
    }
    
    // Try fetching employee clients
    try {
      const clientsResponse = await axios.get('http://localhost:5000/bypass/employee/clients', {
        withCredentials: true,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Clients response status:', clientsResponse.status);
      console.log('Clients count:', clientsResponse.data?.length || 0);
    } catch (error) {
      console.error('Error fetching clients:', error.response?.status, error.response?.data);
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
  }
}

testEmployeeLogin().catch(console.error);