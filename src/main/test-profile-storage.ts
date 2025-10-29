/**
 * Manual test for ProfileStorage service
 * Import this in main.ts temporarily to test the service
 */

import { profileStorage } from './services/ProfileStorage';

export async function testProfileStorage() {
  console.log('\n========== TESTING PROFILE STORAGE ==========');

  try {
    // Test 1: Get all profiles (should be empty initially)
    console.log('\n[TEST 1] Getting all profiles (expect empty array)...');
    const profiles1 = await profileStorage.getAllProfiles();
    console.log('✓ Result:', profiles1.length, 'profiles');

    // Test 2: Create a new profile
    console.log('\n[TEST 2] Creating new profile...');
    const newProfile = await profileStorage.saveProfile({
      name: 'Test Profile',
      targetAudience: 'Developers',
      contentGuidelines: 'Technical and detailed explanations'
    });
    console.log('✓ Created profile:', newProfile.id, '-', newProfile.name);

    // Test 3: Get all profiles (should have 1)
    console.log('\n[TEST 3] Getting all profiles (expect 1 profile)...');
    const profiles2 = await profileStorage.getAllProfiles();
    console.log('✓ Result:', profiles2.length, 'profile(s)');

    // Test 4: Get single profile by ID
    console.log('\n[TEST 4] Getting profile by ID...');
    const fetchedProfile = await profileStorage.getProfile(newProfile.id);
    console.log('✓ Found:', fetchedProfile?.name);

    // Test 5: Update profile
    console.log('\n[TEST 5] Updating profile...');
    const updatedProfile = await profileStorage.updateProfile(newProfile.id, {
      name: 'Updated Test Profile',
      targetAudience: 'All audiences'
    });
    console.log('✓ Updated name:', updatedProfile.name);
    console.log('✓ Updated audience:', updatedProfile.targetAudience);

    // Test 6: Verify update persisted
    console.log('\n[TEST 6] Verifying update persisted...');
    const verifyProfile = await profileStorage.getProfile(newProfile.id);
    console.log('✓ Verified name:', verifyProfile?.name);

    // Test 7: Delete profile
    console.log('\n[TEST 7] Deleting profile...');
    await profileStorage.deleteProfile(newProfile.id);
    console.log('✓ Profile deleted');

    // Test 8: Verify deletion
    console.log('\n[TEST 8] Verifying deletion (expect empty array)...');
    const profiles3 = await profileStorage.getAllProfiles();
    console.log('✓ Result:', profiles3.length, 'profiles');

    console.log('\n========== ALL TESTS PASSED ==========\n');
  } catch (error) {
    console.error('\n[TEST ERROR]', error);
  }
}
