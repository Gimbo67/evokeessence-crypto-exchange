import axios from 'axios';
import fs from 'fs';

async function testUserSession() {
  try {
    // Login as contractor
    console.log('Testing contractor login and session...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'andreavass',
      password: 'Voss786.13',
      recaptchaResponse: 'BYPASS_KEY'
    }, {
      withCredentials: true
    });

    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));

    // Extract cookie from response
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      console.error('No cookies returned from login');
      return;
    }

    // Save cookie for reuse
    fs.writeFileSync('contractor_cookie.txt', cookies.join('\n'));
    console.log('Saved cookies to contractor_cookie.txt');

    // Use the cookie to make a request to the /api/user endpoint
    const sessionResponse = await axios.get('http://localhost:5000/api/user', {
      headers: {
        Cookie: cookies.join('; ')
      }
    });

    console.log('Session response:', JSON.stringify(sessionResponse.data, null, 2));

    return {
      loginData: loginResponse.data,
      sessionData: sessionResponse.data
    };
  } catch (error) {
    console.error('Error testing user session:', error.response?.data || error.message);
  }
}

// Run the test
testUserSession()
  .then(result => {
    if (result) {
      console.log('User session test completed successfully');
    }
  })
  .catch(console.error);