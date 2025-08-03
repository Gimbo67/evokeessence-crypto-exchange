// This script checks the database for contractor information
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

async function checkContractor() {
  try {
    const userData = await db.query.users.findFirst({
      where: eq(users.id, 104)
    });
    
    console.log('User data from DB:', {
      id: userData.id,
      username: userData.username,
      is_contractor: userData.is_contractor,
      is_contractor_type: typeof userData.is_contractor,
      referral_code: userData.referral_code,
      referral_code_type: typeof userData.referral_code
    });
  } catch (error) {
    console.error('Error querying database:', error);
  }
}

checkContractor();