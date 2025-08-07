// Script to create a test profile update request
import { db } from './db/index.js';
import { profileUpdateRequests } from './db/schema.js';

async function createTestProfileUpdate() {
  try {
    console.log('Creating a test profile update request for rejection testing...');
    
    // Create profile update for admin user (ID 2)
    const userId = 2;
    
    // Insert new profile update request
    const [newRequest] = await db
      .insert(profileUpdateRequests)
      .values({
        userId: userId,
        fullName: 'Admin Reject Test',
        email: 'admin@evokeessence.com',
        phoneNumber: '+420999888777',
        address: 'Rejection Test Address',
        countryOfResidence: 'Germany',
        gender: 'male',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    console.log('Created profile update request:', newRequest);
    console.log('Request ID:', newRequest.id);
    
    return newRequest;
  } catch (error) {
    console.error('Error creating profile update request:', error);
  }
}

createTestProfileUpdate()
  .then(() => console.log('Done'))
  .catch(console.error)
  .finally(() => process.exit());
