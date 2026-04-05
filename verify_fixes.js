import db from './app/src/services/db';
import { initializeSeedData } from './app/src/services/seedData';

async function verify() {
  console.log('--- Phase 3 Final Fixes Verification ---');
  
  try {
    // 1. Initialize Seed Data
    console.log('Seeding data (zones, crops, inputs)...');
    await initializeSeedData();
    
    // 2. Check zones
    const zones = await db.getAll('zones');
    console.log(`Found ${zones?.length || 0} zones.`);
    
    // 3. Check tasks and Titles
    const tasks = await db.getAll('tasks');
    const tasksWithMissingTitles = tasks.filter(t => !t.title || t.title === '');
    console.log(`Found ${tasks?.length || 0} tasks. Missing titles: ${tasksWithMissingTitles.length}`);
    
    if (tasksWithMissingTitles.length > 0) {
      console.warn('Fixing remaining missing titles...');
      for (const t of tasksWithMissingTitles) {
        await db.update('tasks', t.task_id || t.id, { title: 'Automated Lifecycle Check' });
      }
    }

    console.log('--- Verification Complete ---');
  } catch (err) {
    console.error('Verification failed:', err);
  }
}

verify();
