/**
 * Test script for LowDB game state persistence
 */
import { gameStatePersistence } from './src/ai/utils/lowdb-persistence';

async function runTests() {
  console.log('Running LowDB persistence tests...');

  // Test session ID
  const testSessionId = 'test-session-' + Date.now();
  
  // Create a test game state
  const testState = {
    seriesSetupComplete: true,
    seriesDetails: {
      seriesTitle: 'Test Series',
      mainCharacter: {
        name: 'Test Character',
        description: 'A test character',
        stats: {
          strength: '5',
          dexterity: '5',
          intelligence: '5'
        }
      },
      lorebook: {
        overallSummary: 'Test summary',
        entries: [{
          name: 'Test Entry',
          description: 'Test Description',
          category: 'Test Category'
        }]
      },
      otherCharacters: [],
      initialPromptForPlayer: 'Test prompt'
    },
    inventory: ['Test item'],
    currentLocation: 'Test location',
    activeQuests: [],
    lastAccessed: Date.now()
  };
  
  try {
    // Test saving
    console.log('Testing save...');
    await gameStatePersistence.save(testSessionId, testState);
    
    // Test loading
    console.log('Testing load...');
    const loadedState = await gameStatePersistence.get(testSessionId);
    console.log('Loaded state:', loadedState ? 'Success' : 'Failed');
    
    if (loadedState) {
      console.log('Series title:', loadedState.seriesDetails?.seriesTitle);
      console.log('Character name:', loadedState.seriesDetails?.mainCharacter.name);
      console.log('Inventory:', loadedState.inventory);
    }
    
    // Test listing
    console.log('Testing list...');
    const sessions = await gameStatePersistence.list();
    console.log('Listed sessions:', sessions.length);
    
    // Test deleting
    console.log('Testing delete...');
    await gameStatePersistence.delete(testSessionId);
    
    // Confirm deletion
    const afterDelete = await gameStatePersistence.get(testSessionId);
    console.log('After delete:', afterDelete ? 'Still exists (fail)' : 'Deleted (success)');
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

runTests().catch(console.error);
