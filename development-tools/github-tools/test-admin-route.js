// This script will be run with the `node -r tsx/esm` to enable direct importing from TypeScript files

// Path to test script
const filename = './test-admin-route.js';
const args = process.argv.slice(2);

// Run this with: node -r tsx/esm test-admin-route.js
console.log(`Running ${filename} with args:`, args);

// Use this to enable TypeScript importing
require('tsx/esm');

// Then manually invoke the routes to verify they work
const { adminEmployeeRouter } = require('./server/routes/admin-employee.routes.ts');
const express = require('express');

// Create mock Express objects
const mockReq = {
  params: { id: 1 },
  body: {
    username: 'testemployee' + Math.floor(Math.random() * 1000),
    fullName: 'Test Employee',
    email: 'test@example.com',
    password: 'password123',
    userGroup: 'kyc_employee',
    permissions: {
      view_transactions: true,
      view_clients: true,
      change_kyc_status: true
    }
  }
};

const mockRes = {
  status: (code) => {
    console.log(`Response status: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
    return mockRes;
  }
};

// Manually invoke employee router endpoint
adminEmployeeRouter.handle(mockReq, mockRes, () => {
  console.log('Router chain completed');
});