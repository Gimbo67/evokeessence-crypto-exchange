import axios from 'axios';

// Get login cookie first
async function loginAndTest() {
  try {
    console.log('Attempting to login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'Adm1nqdU2017'
    }, {
      withCredentials: true
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      console.error('No cookies received from login');
      return;
    }
    
    console.log('Login successful, got authentication cookies');
    
    // Extract cookie for subsequent requests
    const cookieHeader = cookies.join('; ');
    
    // Make a request to employees endpoint
    console.log('Testing /api/admin/employees endpoint...');
    const employeesResponse = await axios.get('http://localhost:5000/api/admin/employees', {
      headers: {
        Cookie: cookieHeader
      }
    });
    
    console.log('Employees API response:', JSON.stringify(employeesResponse.data, null, 2));
    
    // Test creating an employee
    console.log('\nTesting employee creation...');
    const newEmployee = {
      username: 'testemployee' + Math.floor(Math.random() * 1000),
      fullName: 'Test Employee',
      email: 'test' + Math.floor(Math.random() * 1000) + '@example.com',
      password: 'employeepass123',
      userGroup: 'kyc_employee',
      permissions: {
        view_transactions: true,
        view_clients: true,
        view_client_details: true,
        change_kyc_status: true
      }
    };
    
    const createResponse = await axios.post('http://localhost:5000/api/admin/employees', newEmployee, {
      headers: {
        Cookie: cookieHeader
      }
    });
    
    console.log('Create employee response:', JSON.stringify(createResponse.data, null, 2));
    
    // Get the new employee details
    if (createResponse.data.employee && createResponse.data.employee.id) {
      const employeeId = createResponse.data.employee.id;
      console.log(`\nFetching details for employee ID ${employeeId}...`);
      
      const detailResponse = await axios.get(`http://localhost:5000/api/admin/employees/${employeeId}`, {
        headers: {
          Cookie: cookieHeader
        }
      });
      
      console.log('Employee details response:', JSON.stringify(detailResponse.data, null, 2));
      
      // Update employee permissions
      console.log(`\nUpdating permissions for employee ID ${employeeId}...`);
      const updateData = {
        fullName: 'Updated Employee Name',
        permissions: {
          view_transactions: true,
          edit_transactions: true,
          view_clients: true,
          edit_client_info: true
        }
      };
      
      const updateResponse = await axios.patch(`http://localhost:5000/api/admin/employees/${employeeId}/permissions`, updateData, {
        headers: {
          Cookie: cookieHeader
        }
      });
      
      console.log('Update permissions response:', JSON.stringify(updateResponse.data, null, 2));
      
      // Get updated employee details
      console.log(`\nFetching updated details for employee ID ${employeeId}...`);
      const updatedDetailResponse = await axios.get(`http://localhost:5000/api/admin/employees/${employeeId}`, {
        headers: {
          Cookie: cookieHeader
        }
      });
      
      console.log('Updated employee details:', JSON.stringify(updatedDetailResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

loginAndTest();