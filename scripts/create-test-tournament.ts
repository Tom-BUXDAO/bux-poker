import { syncTestTournament } from '../src/lib/tournament/db-sync';

async function main() {
  try {
    const tournament = await syncTestTournament();
    console.log('Test tournament created:', tournament);
  } catch (error) {
    console.error('Failed to create test tournament:', error);
  }
}

main(); 