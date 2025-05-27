// Global variables
let pokemonData = {};
let dailyPokemon = null;
let attempts = 0;
let streak = 0;
let gameOver = false;
let gameWon = false;
let isDarkMode = false;

// DOM elements
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const searchResults = document.getElementById("search-results");
const guessesList = document.getElementById("guesses-list");
const attemptsCount = document.getElementById("attempts-count");
const streakCount = document.getElementById("streak-count");
const timerCount = document.getElementById("timer-count");
const winMessage = document.getElementById("win-message");
const answerPokemon = document.getElementById("answer-pokemon");
const shareButton = document.getElementById("share-button");
const settingsButton = document.getElementById("settings-button");
const settingsDropdown = document.getElementById("settings-dropdown");
const giveUpButton = document.getElementById("give-up-button");
const winTitle = document.getElementById("win-title");
const guessPara = document.getElementById("guess-para");
const themeToggle = document.getElementById("toggle-theme-button");
const gameOverOverlay = document.getElementById("game-over-overlay");
const gameOverTitle = document.getElementById("game-over-title");
const gameOverMessage = document.getElementById("game-over-message");
const overlayShareButton = document.getElementById("overlay-share-button");
const playAgainButton = document.getElementById("play-again-button");

// Load Pokemon data
function handleWin() {
  gameWon = true;
  endGame(true);
}

function endGame(won) {
  gameOver = true;
  saveGameState(); // Save game state immediately when game ends

  if (won) {
    streak++;
    streakCount.textContent = streak;
    gameOverTitle.textContent = "Congratulations!";
    gameOverMessage.textContent = `You guessed today's Pokémon: ${dailyPokemon}`;
  } else {
    streak = 0; // Reset streak if player gave up
    streakCount.textContent = streak;
    gameOverTitle.textContent = "You gave up!";
    gameOverMessage.textContent = `The correct Pokémon is ${dailyPokemon}`;
  }

  answerPokemon.textContent = dailyPokemon; // Update the win message in the main game area
  winMessage.classList.remove("hidden"); // Show the main win message area
  gameOverOverlay.classList.remove("hidden"); // Show the overlay
  saveGameState();
}

async function loadPokemonData() {
  try {
    const response = await fetch("db.json");
    pokemonData = await response.json();
    console.log("Pokemon data loaded successfully");
    initializeGame();
  } catch (error) {
    console.error("Error loading Pokemon data:", error);
  }
}


// Initialize the game
function initializeGame() {
  loadGameState();
  selectDailyPokemon();
  updateTimer();
  setInterval(updateTimer, 1000);
  renderPreviousGuesses();
}

// Select the daily Pokemon
function selectDailyPokemon() {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${
    today.getMonth() + 1
  }-${today.getDate()}`;

  // Use the date as a seed for random selection
  const seed = hashCode(dateString);
  const pokemonNames = Object.keys(pokemonData);
  const dailyIndex = Math.abs(seed) % pokemonNames.length;

  dailyPokemon = pokemonNames[dailyIndex];
  console.log("Daily Pokemon selected (hidden in production)");
}

// Simple string hash function
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Update the countdown timer
function updateTimer() {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const timeLeft = tomorrow - now;

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  timerCount.textContent = `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Handle search input
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  if (query.length < 2) {
    searchResults.innerHTML = "";
    searchResults.classList.remove("active");
    return;
  }

  const matches = Object.keys(pokemonData)
    .filter((name) => name.includes(query))
    .slice(0, 10);

  renderSearchResults(matches);
});

// Render search results
function renderSearchResults(matches) {
  searchResults.innerHTML = "";

  if (matches.length === 0) {
    searchResults.innerHTML =
      '<div class="search-result-item">No matches found</div>';
    searchResults.classList.add("active");
    return;
  }

  matches.forEach((name, index) => {
    const resultItem = document.createElement("div");
    resultItem.classList.add("search-result-item");
    if (index === 0) resultItem.classList.add("selected");
    resultItem.textContent = name;
    resultItem.addEventListener("click", () => makeGuess(name));
    searchResults.appendChild(resultItem);
  });

  searchResults.classList.add("active");
}

// Handle keyboard navigation in search results
searchInput.addEventListener("keydown", (e) => {
  if (!searchResults.classList.contains("active")) return;

  const items = searchResults.querySelectorAll(".search-result-item");
  const selected = searchResults.querySelector(".selected");
  let index = Array.from(items).indexOf(selected);

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      if (index < items.length - 1) {
        if (selected) selected.classList.remove("selected");
        items[index + 1].classList.add("selected");
        items[index + 1].scrollIntoView({ block: "nearest" });
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      if (index > 0) {
        if (selected) selected.classList.remove("selected");
        items[index - 1].classList.add("selected");
        items[index - 1].scrollIntoView({ block: "nearest" });
      }
      break;
    case "Enter":
      e.preventDefault();
      if (selected) {
        makeGuess(selected.textContent);
      }
      break;
    case "Escape":
      e.preventDefault();
      searchResults.innerHTML = "";
      searchResults.classList.remove("active");
      break;
  }
});

// Handle search button click
searchButton.addEventListener("click", () => {
  const query = searchInput.value.trim().toLowerCase();
  if (query.length < 2) return;

  const matches = Object.keys(pokemonData)
    .filter((name) => name.includes(query))
    .slice(0, 10);

  if (matches.length > 0) {
    makeGuess(matches[0]);
  }
});

// Make a guess
function makeGuess(pokemonName) {
  if (gameOver) return;

  // Check if this Pokemon has already been guessed
  const existingGuesses = Array.from(
    guessesList.querySelectorAll(".guess-item")
  );
  for (const guess of existingGuesses) {
    if (guess.dataset.pokemon === pokemonName) {
      // Highlight the existing guess
      guess.style.backgroundColor = "#f0f0f0";
      setTimeout(() => {
        guess.style.backgroundColor = "";
      }, 1000);
      return;
    }
  }

  attempts++;
  attemptsCount.textContent = attempts;

  const guessedPokemon = pokemonData[pokemonName];
  const targetPokemon = pokemonData[dailyPokemon];

  const comparison = comparePokemon(guessedPokemon, targetPokemon);
  renderGuess(pokemonName, comparison);

  // Clear search
  searchInput.value = "";
  searchResults.innerHTML = "";
  searchResults.classList.remove("active");

  // Check if the guess is correct
  if (pokemonName === dailyPokemon) {
    handleWin();
  }

  // Save game state
  saveGameState();
}

// Compare two Pokemon
function comparePokemon(guessed, target) {
  const result = {
    islands: { status: "incorrect", value: guessed.islands },
    encounterMethods: {
      status: "incorrect",
      value: guessed["encounter-methods"],
    },
    highestLevel: {
      status: "incorrect",
      value: guessed.highestLevelSeen,
      direction:
        guessed.highestLevelSeen < target.highestLevelSeen ? "up" : "down",
    },
    multipleForms: { status: "incorrect", value: guessed.multipleForms },
    evolutionTrigger: {
      status: "incorrect",
      value: guessed["evolution-trigger"],
    },
    eggGroup: { status: "incorrect", value: guessed.eggGroup },
    types: { status: "incorrect", value: guessed.types },
    dexNumber: {
      status: "incorrect",
      value: guessed.dexNumber,
      direction: guessed.dexNumber < target.dexNumber ? "up" : "down",
    },
  };

  // Islands comparison
  if (arraysEqual(guessed.islands, target.islands)) {
    result.islands.status = "correct";
  } else if (arraysHaveIntersection(guessed.islands, target.islands)) {
    result.islands.status = "partial";
  }

  // Encounter methods comparison
  if (arraysEqual(guessed["encounter-methods"], target["encounter-methods"])) {
    result.encounterMethods.status = "correct";
  } else if (
    arraysHaveIntersection(
      guessed["encounter-methods"],
      target["encounter-methods"]
    )
  ) {
    result.encounterMethods.status = "partial";
  }

  // Types comparison
  if (arraysEqual(guessed.types, target.types)) {
    result.types.status = "correct";
  } else if (arraysHaveIntersection(guessed.types, target.types)) {
    result.types.status = "partial";
  }

  // Highest level comparison
  if (guessed.highestLevelSeen === target.highestLevelSeen) {
    result.highestLevel.status = "correct";
  }

  // Multiple forms comparison
  if (guessed.multipleForms === target.multipleForms) {
    result.multipleForms.status = "correct";
  }

  // Evolution trigger comparison
  if (guessed["evolution-trigger"] === target["evolution-trigger"]) {
    result.evolutionTrigger.status = "correct";
  }

  // Egg group comparison
  if (arraysEqual(guessed.eggGroup, target.eggGroup)) {
    result.eggGroup.status = "correct";
  } else if (arraysHaveIntersection(guessed.eggGroup, target.eggGroup)) {
    result.eggGroup.status = "partial";
  }

  // Dex number comparison
  if (guessed.dexNumber === target.dexNumber) {
    result.dexNumber.status = "correct";
  }

  return result;
}

// Check if two arrays are equal
function arraysEqual(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
  if (arr1.length !== arr2.length) return false;

  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();

  return sorted1.every((val, i) => val === sorted2[i]);
}

// Check if two arrays have any common elements
function arraysHaveIntersection(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
  if (arr1.length === 0 || arr2.length === 0) return false;

  return arr1.some((item) => arr2.includes(item));
}

// Render a guess
function renderGuess(pokemonName, comparison) {
  const guessItem = document.createElement("div");
  guessItem.classList.add("guess-item");
  guessItem.dataset.pokemon = pokemonName;

  // Pokemon name
  const nameElement = document.createElement("div");
  nameElement.classList.add("property");
  nameElement.textContent = pokemonName;
  guessItem.appendChild(nameElement);

  // Islands
  const islandsElement = document.createElement("div");
  islandsElement.classList.add("property", comparison.islands.status);
  islandsElement.textContent =
    comparison.islands.value.length > 0
      ? comparison.islands.value.join(", ")
      : "None";
  guessItem.appendChild(islandsElement);

  // Encounter methods
  const encounterElement = document.createElement("div");
  encounterElement.classList.add(
    "property",
    comparison.encounterMethods.status
  );
  encounterElement.textContent =
    comparison.encounterMethods.value.length > 0
      ? comparison.encounterMethods.value.join(", ")
      : "None";
  guessItem.appendChild(encounterElement);


  // Highest level
  const levelElement = document.createElement("div");
  levelElement.classList.add("property", comparison.highestLevel.status);
  levelElement.textContent = comparison.highestLevel.value;
  if (comparison.highestLevel.status === "incorrect") {
    const direction = document.createElement("span");
    direction.classList.add("direction-indicator");
    direction.textContent =
      comparison.highestLevel.direction === "up" ? "↑" : "↓";
    levelElement.appendChild(direction);
  }
  guessItem.appendChild(levelElement);



  // Multiple forms
  const formsElement = document.createElement("div");
  formsElement.classList.add("property", comparison.multipleForms.status);
  formsElement.textContent = comparison.multipleForms.value ? "Yes" : "No";
  guessItem.appendChild(formsElement);



  // Evolution trigger
  const evolutionElement = document.createElement("div");
  evolutionElement.classList.add(
    "property",
    comparison.evolutionTrigger.status
  );
  evolutionElement.textContent = comparison.evolutionTrigger.value;
  guessItem.appendChild(evolutionElement);

  // Egg group
  const eggElement = document.createElement("div");
  eggElement.classList.add("property", comparison.eggGroup.status);
  eggElement.textContent = comparison.eggGroup.value.join(", ");
  guessItem.appendChild(eggElement);


  // Types
  const typesElement = document.createElement("div");
  typesElement.classList.add("property", comparison.types.status);
  typesElement.textContent =
    comparison.types.value.length > 0
      ? comparison.types.value.join(", ")
      : "None";
  guessItem.appendChild(typesElement);

  // Dex number
  const dexElement = document.createElement("div");
  dexElement.classList.add("property", comparison.dexNumber.status);
  dexElement.textContent = comparison.dexNumber.value;
  if (comparison.dexNumber.status === "incorrect") {
    const direction = document.createElement("span");
    direction.classList.add("direction-indicator");
    direction.textContent = comparison.dexNumber.direction === "up" ? "↑" : "↓";
    dexElement.appendChild(direction);
  }
  guessItem.appendChild(dexElement);

  // Add to guesses list
  guessesList.prepend(guessItem);
}

// Handle win
// function handleWin() {
//   gameOver = true;
//   streak++;
//   streakCount.textContent = streak;

//   answerPokemon.textContent = dailyPokemon;
//   winMessage.classList.remove("hidden");
// }
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  isDarkMode = document.body.classList.contains("dark-mode");
  saveGameState();
});

giveUpButton.addEventListener("click", () => {
  settingsDropdown.classList.toggle("hidden");
  if (gameOver) return;

  if (confirm("Are you sure you want to give up? Your streak will be reset.")) {
    endGame(false);
  }
});

// Share results
shareButton.addEventListener("click", () => shareGame());

function shareGame() {
  const guessCount = attempts;
  const date = new Date().toLocaleDateString();
  let shareText;
  if (gameWon===true) {
    shareText = `USUMdle ${date} - ${guessCount} ${
      guessCount === 1 ? "guess" : "guesses"
    }\n`;
  }
  else {
    shareText = `USUMdle ${date}\n`
  }
  shareText += gameWon === true ? `I guessed today's Pokémon on https://bignanza.github.io/usumdle` : `I failed to guess today's Pokemon on https://bignanza.github.io/usumdle`;
  shareText += `\nCurrent streak: ${streak}`;

  const guesses = Array.from(guessesList.querySelectorAll(".guess-item")).map(
    (item) => item.dataset.pokemon
  );
  // Build emoji grid showing correct/partial/incorrect for each property
  const guessEmojis = Array.from(guessesList.querySelectorAll(".guess-item")).map(guess => {
    let emojiRow = "";
    const properties = guess.querySelectorAll(".property");
    
    properties.forEach(prop => {
      if(prop.classList.contains("correct")) {
        emojiRow += "🟩"; // Green for correct
      } else if(prop.classList.contains("partial")) {
        emojiRow += "🟨"; // Yellow for partial
      } else if(prop.classList.contains("incorrect")) {
        emojiRow += "🟥"; // Red for incorrect
      }
    });
    return emojiRow;
  });

  shareText += "\n\n" + guessEmojis.join("\n");
  // Copy to clipboard
  navigator.clipboard
    .writeText(shareText)
    .then(() => {
      alert("Results copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
}
// Save game state
function saveGameState() {
  const today = new Date().toDateString();
  const guesses = Array.from(guessesList.querySelectorAll(".guess-item")).map(
    (item) => item.dataset.pokemon
  );

  const gameState = {
    date: today,
    dailyPokemon,
    attempts,
    streak,
    gameOver,
    guesses,
    gameWon,
    isDarkMode,
  };

  localStorage.setItem("usumdle_daily_state", JSON.stringify(gameState));
}

// Load game state
function loadGameState() {
  const savedState = localStorage.getItem("usumdle_daily_state");
  if (!savedState) {
    // First time playing
    streak = 0;
    return;
  }
  const gameState = JSON.parse(savedState);
  const today = new Date();
  const savedDate = new Date(gameState.date);
  if (gameState.isDarkMode) {
    document.body.classList.toggle("dark-mode");
  }
  // Check if saved state is from today
  if (gameState.date === today.toDateString()) {
    // Continue today's game
    dailyPokemon = gameState.dailyPokemon;
    attempts = gameState.attempts;
    streak = gameState.streak;
    gameOver = gameState.gameOver;

    attemptsCount.textContent = attempts;
    streakCount.textContent = streak;

    if (gameOver) {
      answerPokemon.textContent = dailyPokemon;
      winMessage.classList.remove("hidden");
      if (!gameWon) {
        winTitle.textContent = "You gave up!";
        guessPara.textContent = "The correct Pokémon is " + dailyPokemon;
      }
    }
  } else {
    // New day, new game

    attempts = 0;
    gameOver = false;
    streak = gameState.streak;
    // Check if saved state was from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (savedDate.toDateString() !== yesterday.toDateString() || !gameState.gameOver) {
      streak = 0;
    }
    streakCount.textContent = streak;
  }
}

// Render previous guesses when loading a saved game
function renderPreviousGuesses() {
  const savedState = localStorage.getItem("usumdle_daily_state");
  if (!savedState) return;

  const gameState = JSON.parse(savedState);
  const today = new Date().toDateString();

  if (gameState.date === today && gameState.guesses) {
    // Render previous guesses in reverse order (newest first)
    for (let i = gameState.guesses.length - 1; i >= 0; i--) {
      const pokemonName = gameState.guesses[i];
      const guessedPokemon = pokemonData[pokemonName];
      const targetPokemon = pokemonData[dailyPokemon];

      const comparison = comparePokemon(guessedPokemon, targetPokemon);
      renderGuess(pokemonName, comparison);
    }
    gameWon = gameState.gameWon;
  }
}

// Close search results when clicking outside
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.innerHTML = "";
    searchResults.classList.remove("active");
  }
});

// Toggle settings menu
if (settingsButton && settingsDropdown) {
  settingsButton.addEventListener("click", (event) => {
    event.stopPropagation(); // Prevent click from closing menu immediately if we add a document listener later
    settingsDropdown.classList.toggle("hidden");
  });

  // Optional: Close dropdown if clicking outside
  document.addEventListener("click", (event) => {
    if (!settingsButton.contains(event.target) && !settingsDropdown.contains(event.target)) {
      settingsDropdown.classList.add("hidden");
    }
  });
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", loadPokemonData);