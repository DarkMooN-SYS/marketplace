import { db } from '../config/firebase.js';

/**
 * Delete advertisements based on their configured duration (durationDays)
 * Each ad expires after: createdAt + durationDays
 * Run this script periodically (e.g., via cron job)
 */
async function cleanupOldAdvertisements() {
  try {
    console.log('🧹 Starting cleanup of expired advertisements...');
    
    const now = new Date();
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    
    // Get all advertisements
    const adsSnapshot = await db.collection('advertisements').get();
    
    let deletedCount = 0;
    let checkedCount = 0;
    const batch = db.batch();
    
    adsSnapshot.forEach(doc => {
      checkedCount++;
      const data = doc.data();
      
      // Get creation date
      let createdAt;
      if (data.createdAt?._seconds) {
        createdAt = new Date(data.createdAt._seconds * 1000);
      } else if (data.createdAt instanceof Date) {
        createdAt = data.createdAt;
      } else if (typeof data.createdAt === 'string') {
        createdAt = new Date(data.createdAt);
      } else {
        console.warn(`⚠️  Ad ${doc.id} has invalid createdAt:`, data.createdAt);
        return;
      }
      
      // Get durationDays (default to 14 if not specified)
      const durationDays = data.durationDays || 14;
      
      // Calculate expiration date: createdAt + durationDays
      const expirationDate = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      
      // Check if ad has expired
      if (now > expirationDate) {
        console.log(`🗑️  Deleting expired ad: ${doc.id} (Title: "${data.title}", Created: ${createdAt.toISOString()}, Duration: ${durationDays} days, Expired: ${expirationDate.toISOString()})`);
        batch.delete(doc.ref);
        deletedCount++;
      }
    });
    
    // Commit batch delete
    if (deletedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully deleted ${deletedCount} expired advertisements (out of ${checkedCount} total)`);
    } else {
      console.log(`✅ No expired advertisements to delete (checked ${checkedCount} ads)`);
    }
    
    return { deleted: deletedCount, checked: checkedCount };
  } catch (error) {
    console.error('❌ Failed to cleanup expired advertisements:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupOldAdvertisements()
    .then(result => {
      console.log('\n📊 Cleanup Summary:');
      console.log(`   - Advertisements checked: ${result.checked}`);
      console.log(`   - Advertisements deleted: ${result.deleted}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupOldAdvertisements };
