import express from 'express';
import { db } from './db/index.js';
import { users, userPermissions } from './db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Create a simple test app
const app = express();
app.use(express.json());

// Mock Express's Request and Response objects
const mockReq = {
  body: {},
  params: {},
  isAuthenticated: () => true,
  user: { id: 1, isAdmin: true }
};

const mockRes = {
  status: (code) => {
    mockRes.statusCode = code;
    return mockRes;
  },
  json: (data) => {
    mockRes.jsonData = data;
    console.log(`Response (${mockRes.statusCode}):`);
    console.log(JSON.stringify(data, null, 2));
    return mockRes;
  },
  statusCode: 200,
  jsonData: null
};

// Test creating an employee
async function testEmployeeCreation() {
  try {
    console.log('Testing employee creation...');
    
    // Generate a random username to avoid conflicts
    const username = 'testemployee' + Math.floor(Math.random() * 1000);
    
    mockReq.body = {
      username,
      fullName: 'Test Employee',
      email: `${username}@example.com`,
      password: 'password123',
      userGroup: 'kyc_employee',
      permissions: {
        view_transactions: true,
        view_clients: true,
        view_client_details: true,
        change_kyc_status: true
      }
    };
    
    const existingUser = await db.query.users.findFirst({
      where: (users, { or }) => or(
        eq(users.username, mockReq.body.username),
        eq(users.email, mockReq.body.email)
      )
    });

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(mockReq.body.password, 10);
    
    // Create new user with employee role
    const [newUser] = await db
      .insert(users)
      .values({
        username: mockReq.body.username,
        fullName: mockReq.body.fullName,
        email: mockReq.body.email,
        password: hashedPassword,
        userGroup: mockReq.body.userGroup,
        isEmployee: true,
        isAdmin: mockReq.body.userGroup === 'second_admin',
        kyc_status: 'verified'
      })
      .returning();
    
    console.log('Created new user:', newUser);
    
    // Add permissions if provided
    if (mockReq.body.permissions && typeof mockReq.body.permissions === 'object') {
      console.log("Processing permissions:", mockReq.body.permissions);
      
      try {
        const permissionsToInsert = Object.entries(mockReq.body.permissions)
          .filter(([_, granted]) => granted === true)
          .map(([permissionType, _]) => ({
            userId: newUser.id,
            permissionType,
            granted: true
          }));
        
        console.log("Permissions to insert:", permissionsToInsert);
        
        if (permissionsToInsert.length > 0) {
          const result = await db.insert(userPermissions).values(permissionsToInsert).returning();
          console.log("Permission insert result:", result);
        } else {
          console.log("No permissions to insert");
        }
      } catch (permErr) {
        console.error("Error inserting permissions:", permErr);
      }
    } else {
      console.log("No permissions provided in request");
    }
    
    // Retrieve the user with permissions to verify
    const createdUser = await db.query.users.findFirst({
      where: eq(users.id, newUser.id),
      with: {
        permissions: true
      }
    });
    
    console.log('Retrieved created user with permissions:');
    console.log(JSON.stringify(createdUser, null, 2));
    
    // Update permissions
    if (createdUser) {
      console.log('\nTesting permission updates...');
      
      // Define new permissions
      const newPermissions = {
        view_transactions: true,
        edit_transactions: true,
        view_analytics: true,
        view_clients: false
      };
      
      console.log("Processing permissions update for employee ID:", createdUser.id, newPermissions);
      
      try {
        // Delete existing permissions
        const deleteResult = await db
          .delete(userPermissions)
          .where(eq(userPermissions.userId, createdUser.id))
          .returning();
          
        console.log("Deleted existing permissions:", deleteResult);
        
        // Add new permissions
        const permissionsToInsert = Object.entries(newPermissions)
          .filter(([_, granted]) => granted === true)
          .map(([permissionType, _]) => ({
            userId: createdUser.id,
            permissionType,
            granted: true
          }));
        
        console.log("Permissions to insert after update:", permissionsToInsert);
        
        if (permissionsToInsert.length > 0) {
          const insertResult = await db.insert(userPermissions).values(permissionsToInsert).returning();
          console.log("Inserted permissions after update:", insertResult);
        } else {
          console.log("No permissions to insert after update");
        }
      } catch (permErr) {
        console.error("Error updating permissions:", permErr);
      }
      
      // Retrieve the user with updated permissions to verify
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, createdUser.id),
        with: {
          permissions: true
        }
      });
      
      console.log('\nUpdated user with new permissions:');
      console.log(JSON.stringify(updatedUser, null, 2));
    }
  } catch (error) {
    console.error('Error during employee creation test:', error);
  }
}

// Run the test
testEmployeeCreation()
  .then(() => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });