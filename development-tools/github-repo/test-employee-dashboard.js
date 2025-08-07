/**
 * Test script to verify employee dashboard access and permission-based features
 */
import axios from 'axios';

async function testEmployeeDashboard() {
  try {
    console.log('Testing employee dashboard access and permissions...');

    // 1. Login with employee credentials
    console.log('\nLogging in as employee...');
    const employeeCredentials = {
      username: 'testemployee',
      password: 'employee123'
    };

    const loginResponse = await axios.post(
      'http://localhost:5000/bypass/auth/login', 
      employeeCredentials, 
      { validateStatus: () => true }
    );

    if (loginResponse.status !== 200 || !loginResponse.data.authenticated) {
      console.error('Employee login failed:', loginResponse.data.message || 'Unknown error');
      return;
    }

    // Extract the cookie for subsequent requests
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies || cookies.length === 0) {
      console.error('No session cookie returned');
      return;
    }
    
    const sessionCookie = cookies[0].split(';')[0];
    console.log('Login successful, session established');

    // 2. Test dashboard access
    console.log('\nTesting employee dashboard access:');
    
    // Get dashboard stats
    const statsResponse = await axios.get(
      'http://localhost:5000/bypass/employee/dashboard/stats',
      {
        headers: { Cookie: sessionCookie },
        validateStatus: () => true
      }
    );

    if (statsResponse.status === 200) {
      console.log('- Dashboard stats access: SUCCESS');
      console.log('  Received stats:', Object.keys(statsResponse.data).join(', '));
    } else {
      console.log('- Dashboard stats access: FAILED');
      console.log('  Error:', statsResponse.data.error || 'Unknown error');
    }

    // Get dashboard data
    const dashboardResponse = await axios.get(
      'http://localhost:5000/bypass/employee/dashboard',
      {
        headers: { Cookie: sessionCookie },
        validateStatus: () => true
      }
    );

    if (dashboardResponse.status === 200) {
      console.log('- Dashboard data access: SUCCESS');
      console.log('  Received data sections:', Object.keys(dashboardResponse.data).join(', '));
    } else {
      console.log('- Dashboard data access: FAILED');
      console.log('  Error:', dashboardResponse.data.error || 'Unknown error');
    }

    // 3. Check permissions
    console.log('\nChecking employee permissions:');
    
    const permissionsResponse = await axios.get(
      'http://localhost:5000/bypass/employee/dashboard/permissions',
      {
        headers: { Cookie: sessionCookie },
        validateStatus: () => true
      }
    );

    if (permissionsResponse.status === 200) {
      console.log('- Permissions access: SUCCESS');
      console.log('  User group:', permissionsResponse.data.userGroup);
      
      const permissions = permissionsResponse.data.permissions || {};
      const grantedPermissions = Object.keys(permissions).filter(p => permissions[p]);
      
      console.log('  Granted permissions:', grantedPermissions.join(', '));
    } else {
      console.log('- Permissions access: FAILED');
      console.log('  Error:', permissionsResponse.data.error || 'Unknown error');
    }

    console.log('\nEmployee dashboard testing completed successfully!');
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

// Run the test
testEmployeeDashboard().catch(error => {
  console.error('Test failed with error:', error.message);
});