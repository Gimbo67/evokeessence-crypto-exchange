/**
 * Test script to verify the admin employees API endpoints
 */
import axios from 'axios';
import https from 'https';

// Base configuration for requests
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

async function login(username, password) {
  try {
    const response = await api.post('/bypass/auth/login', {
      username,
      password
    });
    
    // Save cookies for subsequent requests
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      api.defaults.headers.Cookie = cookies.join('; ');
    }
    
    console.log(`Login successful for ${username}`);
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testEmployeesEndpoint() {
  console.log('\nTesting /api/admin/employees endpoint...');
  
  try {
    const response = await api.get('/api/admin/employees');
    console.log(`Endpoint returned status: ${response.status}`);
    
    if (response.data && response.data.employees) {
      console.log(`Retrieved ${response.data.employees.length} employees`);
      
      if (response.data.employees.length > 0) {
        const firstEmployee = response.data.employees[0];
        console.log('Sample employee data:');
        console.log(`- ID: ${firstEmployee.id}`);
        console.log(`- Username: ${firstEmployee.username}`);
        console.log(`- User Group: ${firstEmployee.userGroup}`);
        
        const permissionCount = Object.keys(firstEmployee.permissions || {}).length;
        console.log(`- Permission count: ${permissionCount}`);
        
        if (permissionCount > 0) {
          console.log('- Sample permissions:');
          Object.entries(firstEmployee.permissions).slice(0, 3).forEach(([key, value]) => {
            console.log(`  ${key}: ${value ? 'Granted' : 'Denied'}`);
          });
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error testing employees endpoint:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runTest() {
  console.log('Testing Admin Employees API...');
  
  // Login as admin
  const loginSuccess = await login('admin', 'Adm1nqdU2017');
  if (!loginSuccess) {
    console.error('Admin login failed. Aborting test.');
    return;
  }
  
  // Test the employees endpoint
  const endpointSuccess = await testEmployeesEndpoint();
  
  console.log(`\nTest ${endpointSuccess ? 'PASSED' : 'FAILED'}`);
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error in test:', error);
});

// Add explicit export for ES modules
export { runTest };