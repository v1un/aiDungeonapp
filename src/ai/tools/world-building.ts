'use server';

import { z } from 'genkit';
import { LocationDetail, EnvironmentalElement, generateLocationSchema, generateEnvironmentSchema, retrieveLocationSchema } from './world-building-schemas';

/**
 * World Building Tool
 * 
 * This tool helps the AI create rich, detailed environments and
 * populate them with dynamic elements for a more immersive story experience.
 */

// Session-based storage for world building elements
const sessionLocationDetails = new Map<string, Record<string, LocationDetail>>();
const sessionEnvironmentalElements = new Map<string, EnvironmentalElement[]>();

// Helper to get the current session ID
const getCurrentSessionId = (): string => {
  // Use a default session ID if none is set
  const sessionId = (global as {currentSessionId?: string}).currentSessionId || 'default-session';
  return sessionId;
};

// Helper functions to get session-specific data
const getLocationDetails = (): Record<string, LocationDetail> => {
  const sessionId = getCurrentSessionId();
  if (!sessionLocationDetails.has(sessionId)) {
    sessionLocationDetails.set(sessionId, {});
  }
  return sessionLocationDetails.get(sessionId)!;
};

const getEnvironmentalElements = (): EnvironmentalElement[] => {
  const sessionId = getCurrentSessionId();
  if (!sessionEnvironmentalElements.has(sessionId)) {
    sessionEnvironmentalElements.set(sessionId, []);
  }
  return sessionEnvironmentalElements.get(sessionId)!;
};

// Function to generate detailed location information
export async function generateLocation(input: z.infer<typeof generateLocationSchema>) {
  const { locationName, locationType, seriesContext, mood, previouslyMentionedFeatures } = input;
  
  const locationDetails = getLocationDetails();
  
  // Check if this location already exists
  if (locationDetails[locationName]) {
    // Update with any new features mentioned
    if (previouslyMentionedFeatures && previouslyMentionedFeatures.length > 0) {
      previouslyMentionedFeatures.forEach(feature => {
        if (!locationDetails[locationName].notableFeatures.includes(feature)) {
          locationDetails[locationName].notableFeatures.push(feature);
        }
      });
    }
    
    return { location: locationDetails[locationName], isNew: false };
  }
  
  // Generate a new location based on the inputs
  // In a real implementation, this would use more sophisticated generation
  const newLocation: LocationDetail = {
    name: locationName,
    description: generateDescription(locationType, mood, seriesContext),
    atmosphere: generateAtmosphere(locationType, mood),
    notableFeatures: generateFeatures(locationType, previouslyMentionedFeatures),
    hiddenElements: generateHiddenElements(locationType),
    connectedLocations: []
  };
  
  // Store the new location
  locationDetails[locationName] = newLocation;
  
  return { location: newLocation, isNew: true };
}

// Function to generate environmental elements
export async function generateEnvironment(input: z.infer<typeof generateEnvironmentSchema>) {
  const { currentLocation, timeProgression, currentWeather, currentTimeOfDay, desiredMood } = input;
  
  // Generate weather if needed
  let weather: EnvironmentalElement | undefined;
  if (timeProgression > 0.3 || !currentWeather) {
    weather = {
      type: 'weather',
      description: generateWeather(currentLocation, desiredMood),
      impact: generateWeatherImpact()
    };
  }
  
  // Generate time of day if needed
  let timeOfDay: EnvironmentalElement | undefined;
  if (timeProgression > 0.2 || !currentTimeOfDay) {
    timeOfDay = {
      type: 'timeOfDay',
      description: generateTimeOfDay(currentTimeOfDay, timeProgression),
      impact: generateTimeImpact()
    };
  }
  
  // Always generate atmosphere and sensory elements
  const atmosphere: EnvironmentalElement = {
    type: 'atmosphere',
    description: generateAtmosphere(currentLocation, desiredMood),
    impact: "Sets the emotional tone for the scene."
  };
  
  const sound: EnvironmentalElement = {
    type: 'sound',
    description: generateSoundscape(currentLocation, weather?.description),
    impact: "Adds depth to the environment and may alert the character to events."
  };
  
  const smell: EnvironmentalElement = {
    type: 'smell',
    description: generateSmells(currentLocation),
    impact: "Creates immersion and might provide hints about nearby elements."
  };
  
  // Store the new elements (replacing old ones of the same type)
  const envElements = getEnvironmentalElements();
  const filteredElements = envElements.filter(e => 
    (e.type !== 'weather' || !weather) && 
    (e.type !== 'timeOfDay' || !timeOfDay)
  );
  
  // Clear the array and add filtered elements back
  envElements.length = 0;
  filteredElements.forEach(element => envElements.push(element));
  
  const newElements = [
    weather,
    timeOfDay,
    atmosphere,
    sound,
    smell
  ].filter(e => e) as EnvironmentalElement[];
  
  envElements.push(...newElements);
  
  return { 
    environmentalElements: newElements,
    timeHasProgressed: timeProgression > 0
  };
}

// Function to retrieve location information
export async function retrieveLocation(input: z.infer<typeof retrieveLocationSchema>) {
  const { locationName, includeHidden } = input;
  
  const locationDetails = getLocationDetails();
  
  // Check if this location exists
  if (!locationDetails[locationName]) {
    return { 
      exists: false, 
      message: `No details found for location "${locationName}". Use generateLocation tool first.` 
    };
  }
  
  // Return the location, optionally filtering out hidden elements
  const location = {...locationDetails[locationName]};
  
  if (!includeHidden) {
    location.hiddenElements = [];
  }
  
  return { exists: true, location };
}

// Helper functions for generating location details
function generateDescription(locationType: string, mood?: string, context?: string): string {
  // Simple template-based description generator
  const descriptions: Record<string, string[]> = {
    forest: [
      "A dense woodland with towering trees that filter sunlight into dappled patterns on the forest floor.",
      "An ancient forest with gnarled trees covered in moss, where the air hangs heavy with mist.",
      "A vibrant forest alive with birdsong and the rustle of small creatures moving through underbrush."
    ],
    castle: [
      "A formidable stone fortress with high walls and towers that pierce the sky.",
      "An elegant castle with ornate architecture, colorful tapestries, and polished marble floors.",
      "A crumbling castle that speaks of past glory, now partially reclaimed by nature."
    ],
    cave: [
      "A dark, damp cavern with stalactites hanging from the ceiling like stone teeth.",
      "A glittering crystal cave where light reflects in countless rainbow patterns.",
      "A vast underground chamber with ancient carvings on the walls."
    ],
    village: [
      "A quaint settlement with thatched-roof cottages and friendly locals going about their day.",
      "A bustling market village where vendors call out their wares and haggling is an art form.",
      "A remote village nestled between hills, where traditions remain unchanged for generations."
    ],
    spaceship: [
      "A sleek vessel with gleaming metal surfaces and softly humming technology.",
      "A utilitarian spacecraft designed for function over comfort, with exposed pipes and wiring.",
      "A massive generation ship with entire ecosystems contained within its hull."
    ]
  };
  
  // Default to generic if the type isn't in our templates
  const options = descriptions[locationType.toLowerCase()] || [
    "An intriguing location with several notable features and paths to explore.",
    "A distinctive area that showcases elements of this world in vivid detail.",
    "A location that embodies the essence of its surroundings, rich with narrative potential."
  ];
  
  // Randomly select a template
  let description = options[Math.floor(Math.random() * options.length)];
  
  // Modify based on mood if provided
  if (mood) {
    if (mood.toLowerCase().includes('dark') || mood.toLowerCase().includes('ominous')) {
      description += " There's an unsettling quality to the place, as if danger lurks just out of sight.";
    } else if (mood.toLowerCase().includes('peaceful') || mood.toLowerCase().includes('tranquil')) {
      description += " The atmosphere is serene, offering a welcome respite from danger and adventure.";
    } else if (mood.toLowerCase().includes('magical') || mood.toLowerCase().includes('mystical')) {
      description += " There's a palpable sense of magic in the air, hinting at wonders beyond ordinary perception.";
    }
  }
  
  // Add context from the series if provided
  if (context) {
    description += ` This location exemplifies the distinctive style and atmosphere found throughout the world of ${context}.`;
  }
  
  return description;
}

function generateAtmosphere(locationType: string, mood?: string): string {
  // Simple atmospheric descriptions
  const atmospheres: Record<string, string[]> = {
    forest: [
      "Dappled sunlight filters through the canopy, creating an ever-shifting pattern of light and shadow.",
      "The air is rich with the scent of pine and earth, refreshing and primal.",
      "A hushed quiet permeates the space, broken only by occasional birdsong and rustling leaves."
    ],
    castle: [
      "Echoing hallways carry whispers of conversation and the distant clatter of activity.",
      "The weight of history is palpable in the stone walls and ancient tapestries.",
      "Drafts whistle through arrow slits and around corners, carrying a chill."
    ],
    cave: [
      "The darkness seems to swallow light, creating a primal sense of vulnerability.",
      "Water drips from unseen heights, creating an eerie percussion that echoes throughout.",
      "The air is still and heavy with minerals, coating the throat with each breath."
    ],
    village: [
      "The rhythm of daily life creates a comforting backdrop of familiar sounds and movements.",
      "Smoke from cooking fires drifts lazily upward, carrying the promise of home and hearth.",
      "The collective energy of many lives intertwined creates a vibrant, dynamic atmosphere."
    ],
    spaceship: [
      "The constant hum of life support and engines creates a technological lullaby.",
      "Recycled air carries subtle artificial scents designed to combat the sterility of space.",
      "The knowledge of the void just beyond the hull creates an underlying tension."
    ]
  };
  
  // Default to generic if the type isn't in our templates
  const options = atmospheres[locationType.toLowerCase()] || [
    "The atmosphere carries subtle cues about the nature and purpose of this place.",
    "There's a distinctive quality to the environment that affects all who enter it.",
    "The space has its own unique character that influences how one experiences it."
  ];
  
  // Randomly select
  let atmosphere = options[Math.floor(Math.random() * options.length)];
  
  // Modify based on mood if provided
  if (mood) {
    if (mood.toLowerCase().includes('tense')) {
      atmosphere += " There's an undercurrent of tension that keeps one alert and watchful.";
    } else if (mood.toLowerCase().includes('melancholy')) {
      atmosphere += " A subtle sadness permeates the space, touching the heart with gentle sorrow.";
    } else if (mood.toLowerCase().includes('joyful')) {
      atmosphere += " The atmosphere lifts the spirit, invoking a sense of possibility and delight.";
    }
  }
  
  return atmosphere;
}

function generateFeatures(locationType: string, previouslyMentioned?: string[]): string[] {
  const commonFeatures: Record<string, string[]> = {
    forest: [
      "A shallow stream cutting through the forest floor",
      "A massive tree that towers above the others",
      "A small clearing bathed in sunlight",
      "Animal tracks criss-crossing the path",
      "Berry bushes with colorful fruit"
    ],
    castle: [
      "An ornate fountain in the courtyard",
      "Arrow slits in the thick outer walls",
      "Tapestries depicting historical events",
      "A grand staircase leading to upper floors",
      "Suits of armor standing at attention"
    ],
    cave: [
      "Stalactites hanging from the ceiling",
      "A subterranean pool of clear water",
      "Phosphorescent fungi providing dim light",
      "Narrow passages leading deeper",
      "Ancient carvings on the smoother walls"
    ],
    village: [
      "A central well or water source",
      "A community gathering place",
      "Gardens and small farm plots",
      "A notice board with local news",
      "Distinct architectural styles showing history"
    ],
    spaceship: [
      "Control panels with blinking lights",
      "Viewport showing the stars outside",
      "Narrow corridors optimized for space",
      "Storage compartments built into walls",
      "Life support systems humming quietly"
    ]
  };
  
  // Get features for this location type or use generic ones
  const possibleFeatures = commonFeatures[locationType.toLowerCase()] || [
    "A distinctive landmark that draws the eye",
    "Signs of those who've been here before",
    "Natural features that define the space",
    "Elements that hint at the location's purpose",
    "Details that make this place unique"
  ];
  
  // Start with previously mentioned features
  const features = [...(previouslyMentioned || [])];
  
  // Add 2-4 random features that haven't been mentioned yet
  const numToAdd = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...possibleFeatures].sort(() => 0.5 - Math.random());
  
  for (const feature of shuffled) {
    if (features.length >= numToAdd) break;
    if (!features.includes(feature)) {
      features.push(feature);
    }
  }
  
  return features;
}

function generateHiddenElements(locationType: string): string[] {
  const hiddenElements: Record<string, string[]> = {
    forest: [
      "A hidden cache of supplies left by a previous traveler",
      "A small cave concealed by hanging vines",
      "An abandoned animal den that could serve as shelter",
      "A rare medicinal herb growing in a secluded spot",
      "Signs of poachers or other dangerous individuals"
    ],
    castle: [
      "A secret passage behind a bookcase",
      "A hidden room accessible only through a specific mechanism",
      "An old letter tucked between stones in the wall",
      "A forgotten treasure concealed in a common object",
      "Evidence of betrayal or conspiracy among the castle inhabitants"
    ],
    cave: [
      "A narrow crevice leading to an undiscovered chamber",
      "Valuable minerals embedded in an ordinary-looking wall",
      "Ancient artifacts half-buried in sediment",
      "Air flow suggesting another exit",
      "Signs of recent habitation by something that prefers darkness"
    ],
    village: [
      "A cellar with contraband or secret stores",
      "Evidence of unusual practices or beliefs",
      "A message system used by a covert group",
      "Clues to a local mystery or legend",
      "Signs of conflict beneath the peaceful facade"
    ],
    spaceship: [
      "A maintenance shaft providing access to restricted areas",
      "Modified systems not on the official schematics",
      "Personal items hidden by crew members",
      "Signs of sabotage or unauthorized experiments",
      "Emergency supplies not in the inventory"
    ]
  };
  
  // Get hidden elements for this location type or use generic ones
  const possibleElements = hiddenElements[locationType.toLowerCase()] || [
    "A concealed item of value or importance",
    "A hidden path or access point",
    "Evidence that changes the understanding of this place",
    "A secret that someone wanted to keep",
    "A danger or opportunity not immediately apparent"
  ];
  
  // Select 1-3 random hidden elements
  const numToAdd = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...possibleElements].sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, numToAdd);
}

// Helper functions for generating environmental elements
function generateWeather(location: string, mood?: string): string {
  const weatherTypes = [
    "Clear skies with brilliant sunshine",
    "Scattered clouds casting moving shadows",
    "Overcast skies threatening rain",
    "A gentle rainfall that creates a soothing rhythm",
    "A heavy downpour that limits visibility and movement",
    "Thick fog that obscures distant objects",
    "A light snowfall creating a serene landscape",
    "Biting wind that cuts through clothing",
    "A brewing storm with distant thunder",
    "Oppressive heat that slows movement and thought"
  ];
  
  // Select base weather
  let weatherIndex = Math.floor(Math.random() * weatherTypes.length);
  
  // Adjust based on mood if provided
  if (mood) {
    if (mood.toLowerCase().includes('tense') || mood.toLowerCase().includes('dangerous')) {
      // More extreme weather for tense moments
      weatherIndex = 4 + Math.floor(Math.random() * 6); // Indices 4-9 are more extreme
    } else if (mood.toLowerCase().includes('peaceful') || mood.toLowerCase().includes('serene')) {
      // Calmer weather for peaceful moments
      weatherIndex = Math.floor(Math.random() * 4); // Indices 0-3 are calmer
    }
  }
  
  return weatherTypes[weatherIndex];
}

function generateWeatherImpact(): string {
  const impacts = [
    "The weather makes travel slower but doesn't prevent it.",
    "Visibility is affected, making it harder to spot distant details.",
    "The temperature affects comfort and potentially stamina.",
    "Sound carries differently in these conditions.",
    "The terrain becomes more challenging to navigate.",
    "It creates a distinctive atmosphere that affects mood and perspective."
  ];
  
  return impacts[Math.floor(Math.random() * impacts.length)];
}

function generateTimeOfDay(current?: string, progression: number = 0.5): string {
  const timeSequence = [
    "Early morning with golden dawn light",
    "Mid-morning with brightening skies",
    "Noon with the sun at its zenith",
    "Early afternoon with warm, full light",
    "Late afternoon with lengthening shadows",
    "Evening with the golden light of sunset",
    "Dusk with rapidly fading light",
    "Night with darkness broken only by stars and moon",
    "Deep night when the world seems most still",
    "The pre-dawn hours when night begins to yield"
  ];
  
  if (!current) {
    // If no current time, randomly select one
    return timeSequence[Math.floor(Math.random() * timeSequence.length)];
  }
  
  // Find the current time in the sequence
  const currentIndex = timeSequence.findIndex(time => 
    current.toLowerCase().includes(time.substring(0, 10).toLowerCase())
  );
  
  if (currentIndex === -1) {
    // If not found, default to a random time
    return timeSequence[Math.floor(Math.random() * timeSequence.length)];
  }
  
  // Calculate how many steps to advance based on progression
  const steps = Math.floor(progression * 3) + 1; // 1-4 steps
  
  // Advance the time, wrapping around if necessary
  const newIndex = (currentIndex + steps) % timeSequence.length;
  
  return timeSequence[newIndex];
}

function generateTimeImpact(): string {
  const impacts = [
    "The quality of light affects what can be easily seen.",
    "The time of day influences which creatures or people might be active.",
    "Temperature varies with the sun's position, affecting comfort.",
    "The psychological impact of time creates distinct atmosphere.",
    "Cultural or social activities may be time-dependent.",
    "Navigation might be easier or more difficult depending on light."
  ];
  
  return impacts[Math.floor(Math.random() * impacts.length)];
}

function generateSoundscape(location: string, weather?: string): string {
  const locationSounds: Record<string, string[]> = {
    forest: [
      "Birdsong creates a natural melody among the trees",
      "Leaves rustle and branches creak in the breeze",
      "Small creatures scurry through the underbrush",
      "Water gurgles in a nearby stream",
      "Distant animal calls echo through the woods"
    ],
    castle: [
      "Footsteps echo on stone floors and stairways",
      "Guards call to one another during shift changes",
      "Doors and gates creak on iron hinges",
      "Conversations and activity create a distant hum",
      "Wind whistles through arrow slits and windows"
    ],
    cave: [
      "Water drips rhythmically from unseen heights",
      "Small stones occasionally tumble from above",
      "The subtle sound of air flowing through passages",
      "Echoes distort and amplify even small noises",
      "Strange resonances occur in larger chambers"
    ],
    village: [
      "People call greetings and exchange news",
      "Animals add their voices to the human sounds",
      "Tools clank and bang as daily work proceeds",
      "Children laugh and shout during play",
      "The community's heartbeat expressed in collective sound"
    ],
    spaceship: [
      "Life support systems create a constant background hum",
      "Occasional alerts and notifications ping",
      "Machinery whirs as automated systems function",
      "Voices carry strangely through metal corridors",
      "Creaking and settling as the hull expands and contracts"
    ]
  };
  
  // Get sounds for this location type or use generic ones
  const possibleSounds = locationSounds[location.toLowerCase()] || [
    "Ambient sounds specific to this environment",
    "Audio cues that help define the space",
    "Background noise that feels appropriate to the setting",
    "Distinctive sounds that identify this particular location",
    "A soundscape that enhances the atmosphere"
  ];
  
  // Select a base sound
  let soundscape = possibleSounds[Math.floor(Math.random() * possibleSounds.length)];
  
  // Add weather effects if provided
  if (weather) {
    if (weather.includes("rain")) {
      soundscape += ". Raindrops create a pattering rhythm that changes the acoustic space";
    } else if (weather.includes("wind")) {
      soundscape += ". Wind adds its voice, sometimes whispering, sometimes howling";
    } else if (weather.includes("thunder")) {
      soundscape += ". Thunder occasionally rumbles, vibrating the very air";
    } else if (weather.includes("snow")) {
      soundscape += ". The snow creates a hushed quality, dampening other sounds";
    }
  }
  
  return soundscape;
}

function generateSmells(location: string): string {
  const locationSmells: Record<string, string[]> = {
    forest: [
      "Rich earth and decomposing leaves create a primal scent",
      "Pine resin and flowering plants offer sweet and sharp notes",
      "Moss and fungi contribute subtle musty undertones",
      "Fresh growth and green things dominate after rain",
      "Animal musk occasionally wafts through on the breeze"
    ],
    castle: [
      "Stone and mortar carry the mineral smell of age",
      "Tapestries and furnishings hold the scent of smoke and history",
      "Kitchens send aromatic hints of meals throughout",
      "Tallow candles and oil lamps create distinctive notes",
      "Hints of perfume and human occupation linger in living areas"
    ],
    cave: [
      "Damp stone and minerals create a distinctive cavern smell",
      "Stagnant air holds scents for longer periods",
      "Water contributes clean or sometimes sulfurous notes",
      "Fungi and lichen add subtle organic elements",
      "Earth and rock dust form the base of the olfactory experience"
    ],
    village: [
      "Cooking fires and food preparation dominate at mealtimes",
      "Livestock and gardens contribute rural aromatics",
      "Human activity creates a complex tapestry of scents",
      "Crafts and industry add their specific smells",
      "The collective scent of community life in all its facets"
    ],
    spaceship: [
      "Recycled air with subtle artificial fresheners",
      "Technical components and materials with their own scent profiles",
      "Carefully controlled environment with minimal olfactory intrusion",
      "Hints of materials not meant to be detected",
      "Personal items that introduce unauthorized scents"
    ]
  };
  
  // Get smells for this location type or use generic ones
  const possibleSmells = locationSmells[location.toLowerCase()] || [
    "Scents appropriate to the materials and purpose of this place",
    "Olfactory information that helps define the environment",
    "Smells that contribute to the overall sensory experience",
    "Aromatic elements that trigger associations and memories",
    "The unique olfactory signature of this location"
  ];
  
  return possibleSmells[Math.floor(Math.random() * possibleSmells.length)];
}


