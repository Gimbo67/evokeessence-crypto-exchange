import { db } from '@db';
import { users, profileUpdateRequests } from '@db/schema';
import { eq } from 'drizzle-orm';

/**
 * Creates a test profile update request for a random user
 * This script can be used for testing the profile update approval workflow
 */
async function createTestProfileUpdateRequest() {
  try {
    console.log('Creating a test profile update request...');
    
    // Find a user to create the request for
    const allUsers = await db.query.users.findMany({
      limit: 5,
      orderBy: users.id
    });
    
    if (allUsers.length === 0) {
      console.error('No users found. Please create some users first.');
      return;
    }
    
    // Select the first user
    const user = allUsers[0];
    console.log(`Selected user: ${user.username} (ID: ${user.id})`);
    
    // Check if user already has pending requests
    const pendingRequests = await db.query.profileUpdateRequests.findMany({
      where: eq(profileUpdateRequests.userId, user.id),
      orderBy: [profileUpdateRequests.createdAt]
    });
    
    console.log(`User has ${pendingRequests.length} profile update requests`);
    
    // Create a new profile update request
    const [newRequest] = await db
      .insert(profileUpdateRequests)
      .values({
        userId: user.id,
        fullName: `${user.fullName || 'Test'} Updated`,
        email: user.email,
        phoneNumber: user.phoneNumber ? `+${Math.floor(Math.random() * 1000000000)}` : '+420666777888',
        address: user.address || 'New Test Address 123',
        countryOfResidence: user.countryOfResidence || 'Czech Republic',
        gender: user.gender || 'other',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    console.log(`Created new profile update request with ID ${newRequest.id}`);
    console.log('Request details:', newRequest);
    
  } catch (error) {
    console.error('Error creating test profile update request:', error);
  }
}

// Run the function
createTestProfileUpdateRequest()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });