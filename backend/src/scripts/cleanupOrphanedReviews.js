import { db } from '../config/firebase.js';

async function cleanupOrphanedReviews() {
  console.log('🔍 Checking for orphaned reviews...\n');
  
  try {
    // Get all reviews
    const reviewsSnapshot = await db.collection('reviews').get();
    
    let orphanedCount = 0;
    const orphanedReviews = [];
    
    console.log(`📊 Total reviews: ${reviewsSnapshot.size}\n`);
    
    // Check each review
    for (const reviewDoc of reviewsSnapshot.docs) {
      const review = reviewDoc.data();
      const productId = review.productId;
      
      if (!productId) {
        console.warn(`⚠️  Review ${reviewDoc.id} has no productId`);
        orphanedReviews.push({ id: reviewDoc.id, reason: 'No productId' });
        continue;
      }
      
      // Check if product exists
      const productDoc = await db.collection('products').doc(productId).get();
      
      if (!productDoc.exists) {
        console.warn(`⚠️  Review ${reviewDoc.id} references non-existent product ${productId}`);
        orphanedReviews.push({ id: reviewDoc.id, productId, reason: 'Product not found' });
        orphanedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total reviews: ${reviewsSnapshot.size}`);
    console.log(`   Valid reviews: ${reviewsSnapshot.size - orphanedCount}`);
    console.log(`   Orphaned reviews: ${orphanedCount}`);
    
    if (orphanedCount > 0) {
      console.log('\n🗑️  Orphaned reviews:');
      orphanedReviews.forEach(item => {
        console.log(`   - ${item.id} (${item.reason}${item.productId ? ': ' + item.productId : ''})`);
      });
      
      // If DELETE env variable is set, delete them
      if (process.env.DELETE === 'true') {
        console.log('\n🗑️  Deleting orphaned reviews...');
        
        for (const item of orphanedReviews) {
          await db.collection('reviews').doc(item.id).delete();
          console.log(`   ✅ Deleted review ${item.id}`);
        }
        
        console.log(`\n✅ Successfully deleted ${orphanedCount} orphaned reviews`);
      } else {
        console.log('\n⚠️  To delete these reviews, run:');
        console.log('   set DELETE=true && node src/scripts/cleanupOrphanedReviews.js');
        console.log('   (Windows PowerShell: $env:DELETE="true"; node src/scripts/cleanupOrphanedReviews.js)');
      }
    } else {
      console.log('\n✅ No orphaned reviews found!');
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup error:', error);
    throw error;
  }
}

// Run the cleanup
cleanupOrphanedReviews()
  .then(() => {
    console.log('\n✅ Cleanup complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
