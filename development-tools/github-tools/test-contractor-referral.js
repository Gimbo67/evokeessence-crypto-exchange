import axios from 'axios';
import fs from 'fs';

// Common API call helper
async function callApi(endpoint, method = 'GET', data = null, cookies = null) {
  try {
    const config = {
      method,
      url: `http://localhost:5000${endpoint}`,
      headers: {}
    };
    
    if (cookies) {
      config.headers.Cookie = cookies;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Login as admin
async function loginAsAdmin() {
  console.log('Logging in as admin...');
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'Adm1nU2017',
      recaptchaResponse: 'BYPASS_KEY'
    });
    
    // Extract and save cookies
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      fs.writeFileSync('admin_cookie.txt', cookies.join('\n'));
      console.log('Admin cookies saved.');
      return cookies.join('; ');
    } else {
      console.error('No cookies returned from admin login');
      return null;
    }
  } catch (error) {
    console.error('Admin login failed:', error.response?.data || error.message);
    return null;
  }
}

// Login as contractor
async function loginAsContractor() {
  console.log('Logging in as contractor (andreavass)...');
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'andreavass',
      password: 'Voss786.13',
      recaptchaResponse: 'BYPASS_KEY'
    });
    
    // Extract and save cookies
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      fs.writeFileSync('contractor_cookie.txt', cookies.join('\n'));
      console.log('Contractor cookies saved.');
      return cookies.join('; ');
    } else {
      console.error('No cookies returned from contractor login');
      return null;
    }
  } catch (error) {
    console.error('Contractor login failed:', error.response?.data || error.message);
    return null;
  }
}

// Check admin analytics to see if contractor stats are included
async function checkAdminAnalytics(adminCookies) {
  console.log('Checking admin analytics for contractor data...');
  try {
    const analyticsData = await callApi('/api/admin/analytics', 'GET', null, adminCookies);
    console.log('Admin analytics received.');
    
    // Check specifically for contractor analytics section
    if (analyticsData.yearToDate && analyticsData.yearToDate.contractors) {
      const contractors = analyticsData.yearToDate.contractors;
      console.log('\n===== ADMIN DASHBOARD: CONTRACTOR ANALYTICS =====');
      console.log(`- Contractor count: ${contractors.count}`);
      console.log(`- Referred deposits: ${contractors.referredDeposits}`);
      console.log(`- Referred amount: ${contractors.referredAmount}`);
      console.log(`- Commission amount: ${contractors.commissionAmount}`);
      if (contractors.completedReferredDeposits) {
        console.log(`- Completed referred deposits: ${contractors.completedReferredDeposits}`);
        console.log(`- Completed referred amount: ${contractors.completedReferredAmount}`);
        console.log(`- Completed commission amount: ${contractors.completedCommissionAmount}`);
      }
      console.log('=================================================\n');
    } else {
      console.error('✗ No contractor analytics found in admin dashboard');
    }
    
    return analyticsData;
  } catch (error) {
    console.error('Failed to fetch admin analytics:', error.message);
    return null;
  }
}

// Check contractor's own analytics
async function checkContractorAnalytics(contractorCookies) {
  console.log('Checking contractor analytics...');
  try {
    const analyticsData = await callApi('/api/contractor/analytics', 'GET', null, contractorCookies);
    console.log('Contractor analytics received.');
    
    if (analyticsData) {
      console.log('\n===== CONTRACTOR ANALYTICS DASHBOARD =====');
      console.log(`- Referral code: ${analyticsData.referralCode || 'N/A'}`);
      console.log(`- Referred clients: ${analyticsData.referredClientsCount || 0}`);
      console.log(`- Total referred deposits: ${analyticsData.totalReferredDeposits || 0}`);
      console.log(`- Total commission: ${analyticsData.totalCommission || 0}`);
      
      // If there are referred clients, show them
      if (analyticsData.referredClients && analyticsData.referredClients.length > 0) {
        console.log('\nReferred Clients:');
        analyticsData.referredClients.forEach((client, index) => {
          console.log(`  ${index + 1}. ${client.username} (${client.fullName || 'No name'}) - Deposits: ${client.depositCount || 0}`);
        });
      }
      
      // If there are referred deposits, show them
      if (analyticsData.referredDeposits && analyticsData.referredDeposits.length > 0) {
        console.log('\nReferred Deposits:');
        analyticsData.referredDeposits.forEach((deposit, index) => {
          console.log(`  ${index + 1}. Amount: ${deposit.amount || 0} ${deposit.currency || 'EUR'} - Commission: ${deposit.contractorCommission || 0}`);
        });
      }
      console.log('===========================================\n');
    } else {
      console.log('No contractor analytics data received');
    }
    
    return analyticsData;
  } catch (error) {
    console.error('Failed to fetch contractor analytics:', error.message);
    return null;
  }
}

// Main test function
async function testContractorReferrals() {
  try {
    // 1. Login as admin to check admin analytics
    const adminCookies = await loginAsAdmin();
    if (adminCookies) {
      await checkAdminAnalytics(adminCookies);
    }
    
    // 2. Login as contractor to check personal analytics
    const contractorCookies = await loginAsContractor();
    if (contractorCookies) {
      await checkContractorAnalytics(contractorCookies);
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testContractorReferrals();