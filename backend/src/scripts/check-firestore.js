import { db } from '../config/firebase.js';

/**
 * Simple test to check if data exists in Firestore
 */
async function testFirestoreData() {
  try {
    console.log('🔍 Checking Firestore collections...\n');

    // Check activities
    console.log('📋 Activities:');
    const activitiesSnapshot = await db.collection('activities').get();
    console.log(`   Total documents: ${activitiesSnapshot.size}`);
    
    if (activitiesSnapshot.size > 0) {
      activitiesSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. [${data.type}] ${data.action} - ${data.item}`);
      });
    } else {
      console.log('   ❌ No activities found! Run: node src/scripts/seed-activities.js');
    }

    console.log('\n📅 Upcoming Events:');
    const eventsSnapshot = await db.collection('upcoming_events').get();
    console.log(`   Total documents: ${eventsSnapshot.size}`);
    
    if (eventsSnapshot.size > 0) {
      eventsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        const eventDate = new Date(data.date);
        console.log(`   ${index + 1}. ${data.title} - ${eventDate.toLocaleDateString()}`);
      });
    } else {
      console.log('   ❌ No upcoming events found! Run: node src/scripts/seed-upcoming-events.js');
    }

    console.log('\n✅ Firestore check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
    process.exit(1);
  }
}

testFirestoreData();
