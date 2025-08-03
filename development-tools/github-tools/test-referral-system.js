/**
 * Comprehensive test for the contractor referral system
 */
import fetch from 'node-fetch';
import fs from 'fs';
const cookieJar = {
  admin: null,
  contractor: null
};

// Helper functions
const saveCookies = (cookies, type) => {
  cookieJar[type] = cookies;
};

async function login(username, password, type) {
  console.log(`Logging in as ${type}: ${username}...`);
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        password,
        recaptchaResponse: 'BYPASS_KEY'
      })
    });
    
    if (!response.ok) {
      console.error(`Failed to login as ${type}: ${response.status} ${response.statusText}`);
      return false;
    }
    
    // Save the cookies for subsequent requests
    const cookies = response.headers.get('set-cookie');
    saveCookies(cookies, type);
    
    const userData = await response.json();
    console.log(`${type} login successful: ${userData.username}`);
    console.log(`Is ${type}: ${type === 'admin' ? userData.isAdmin : userData.isContractor}`);
    
    return true;
  } catch (error) {
    console.error(`Error during ${type} login:`, error.message);
    return false;
  }
}

async function fetchAdminAnalytics() {
  console.log("\nTesting Admin Analytics...");
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/analytics', {
      headers: { Cookie: cookieJar.admin }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch admin analytics: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const analyticsData = await response.json();
    
    console.log("\n===== ADMIN DASHBOARD: CONTRACTOR ANALYTICS =====");
    const contractors = analyticsData.yearToDate.contractors;
    console.log(`- Contractor count: ${contractors.count}`);
    console.log(`- Referred deposits: ${contractors.referredDeposits}`);
    console.log(`- Referred amount: ${contractors.referredAmount}`);
    console.log(`- Commission amount: ${contractors.commissionAmount}`);
    console.log(`- Completed referred deposits: ${contractors.completedReferredDeposits}`);
    console.log(`- Completed referred amount: ${contractors.completedReferredAmount}`);
    console.log(`- Completed commission amount: ${contractors.completedCommissionAmount}`);
    console.log("=================================================");
    
    return analyticsData;
  } catch (error) {
    console.error("Error fetching admin analytics:", error.message);
    return null;
  }
}

async function fetchContractorAnalytics() {
  console.log("\nTesting Contractor Analytics...");
  
  try {
    const response = await fetch('http://localhost:5000/api/contractor/analytics', {
      headers: { Cookie: cookieJar.contractor }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch contractor analytics: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const analyticsData = await response.json();
    
    console.log("\n===== CONTRACTOR ANALYTICS DASHBOARD =====");
    console.log(`- Referral code: ${analyticsData.referralCode}`);
    console.log(`- Contractor commission rate: ${analyticsData.contractorCommissionRate * 100}%`);
    console.log(`- Referred clients: ${analyticsData.referredClientsCount}`);
    console.log(`- Total referred deposits: ${analyticsData.totalReferredDeposits}`);
    console.log(`- Total commission: ${analyticsData.totalCommission}`);
    
    if (analyticsData.referredClients && analyticsData.referredClients.length > 0) {
      console.log("\nReferred Clients:");
      analyticsData.referredClients.forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.username} (${client.fullName}) - Deposits: ${client.depositCount}`);
      });
    }
    
    if (analyticsData.referredDeposits && analyticsData.referredDeposits.length > 0) {
      console.log("\nReferred Deposits:");
      analyticsData.referredDeposits.forEach((deposit, index) => {
        console.log(`  ${index + 1}. Amount: ${deposit.amount} ${deposit.currency} - Commission: ${deposit.contractorCommission}`);
      });
    }
    
    console.log("===========================================");
    
    return analyticsData;
  } catch (error) {
    console.error("Error fetching contractor analytics:", error.message);
    return null;
  }
}

async function runTests() {
  console.log("================ CONTRACTOR REFERRAL SYSTEM TEST ================");
  
  // 1. Admin login and analytics
  const adminLoggedIn = await login('admin', 'Adm1nU2017', 'admin');
  if (adminLoggedIn) {
    await fetchAdminAnalytics();
  }
  
  // 2. Contractor login and analytics
  const contractorLoggedIn = await login('andreavass', 'Voss786.13', 'contractor');
  if (contractorLoggedIn) {
    await fetchContractorAnalytics();
  }
  
  console.log("\nTest completed.");
}

// Run the tests
runTests()
  .then(() => console.log("All tests finished."))
  .catch((error) => console.error("Tests failed with error:", error));