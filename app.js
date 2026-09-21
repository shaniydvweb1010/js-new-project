/* ============================================
   ROCKRUSH — Rock Paper Scissors
   Vanilla JavaScript Game Logic
   ============================================ */

(function () {
  'use strict';

  // ---------- GAME STATE ----------
  let playerScore = 0;
  let computerScore = 0;
  let isAnimating = false;
  let roundComplete = false;

  // ---------- DOM ELEMENTS ----------
  const playerScoreDisplay = document.getElementById('playerScoreDisplay');
  const computerScoreDisplay = document.getElementById('computerScoreDisplay');
  const playerEmoji = document.getElementById('playerEmoji');
  const computerEmoji = document.getElementById('computerEmoji');
  const resultMessage = document.getElementById('resultMessage');
  const playerBox = document.getElementById('playerCharacterBox');
  const computerBox = document.getElementById('computerCharacterBox');
  const rockBtn = document.getElementById('rockBtn');
  const paperBtn = document.getElementById('paperBtn');
  const scissorsBtn = document.getElementById('scissorsBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const choiceButtons = [rockBtn, paperBtn, scissorsBtn];

  // ---------- HTML SNIPPETS ----------

  // The smiling animated Font Awesome icon used inside the character boxes
  const SMILE_ICON_HTML =
    '<i class="fa-mosaic fa-solid fa-face-smile" style="color: rgb(235, 217, 21);"></i>';

  // Reaction faces for win/lose/draw states
  const REACTION_FACES = {
    happy: '😄',
    sad: '😢',
    neutral: '😐'
  };

  // ---------- SPEECH SYNTHESIS ----------
  let voicesLoaded = false;
  let cachedVoices = [];

  // Pre-load voices. Some browsers load them asynchronously.
  function loadVoices() {
    cachedVoices = window.speechSynthesis.getVoices();
    if (cachedVoices.length > 0) {
      voicesLoaded = true;
    }
  }

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  /**
   * Returns the best available voice.
   * Priority: "Abigail" → any English female voice → default voice
   */
  function getPreferredVoice() {
    if (!voicesLoaded || cachedVoices.length === 0) {
      cachedVoices = window.speechSynthesis.getVoices();
    }

    if (cachedVoices.length === 0) return null;

    // 1. Try to find "Abigail" (exact or partial match)
    const abigail = cachedVoices.find(function (voice) {
      return voice.name && voice.name.toLowerCase().indexOf('abigail') !== -1;
    });
    if (abigail) return abigail;

    // 2. Fallback: closest available English female voice
    const femaleHints = [
      'female', 'samantha', 'karen', 'moira', 'tessa', 'victoria',
      'zira', 'susan', 'allison', 'ava', 'serena', 'joanna', 'amy',
      'emma', 'olivia', 'google uk english female',
      'google us english', 'microsoft zira'
    ];

    const englishFemale = cachedVoices.find(function (voice) {
      const name = (voice.name || '').toLowerCase();
      const lang = (voice.lang || '').toLowerCase();
      const isEnglish = lang.indexOf('en') === 0;
      const hasFemaleHint = femaleHints.some(function (hint) {
        return name.indexOf(hint) !== -1;
      });
      return isEnglish && hasFemaleHint;
    });
    if (englishFemale) return englishFemale;

    // 3. Fallback: any English voice
    const anyEnglish = cachedVoices.find(function (voice) {
      return (voice.lang || '').toLowerCase().indexOf('en') === 0;
    });
    if (anyEnglish) return anyEnglish;

    // 4. Fallback: default
    return null;
  }

  /**
   * Speaks the given text using the preferred voice.
   * Cancels any in-progress speech first.
   */
  function speak(text) {
    if (!('speechSynthesis' in window)) return;

    // Cancel any current speech so we don't queue up
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    utterance.volume = 1.0;

    const voice = getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // ---------- HELPER FUNCTIONS ----------

  /**
   * Randomly returns 'rock', 'paper', or 'scissors'
   */
  function getComputerChoice() {
    const choices = ['rock', 'paper', 'scissors'];
    const randomIndex = Math.floor(Math.random() * 3);
    return choices[randomIndex];
  }

  /**
   * Returns 'player', 'computer', or 'draw'
   */
  function determineWinner(player, computer) {
    if (player === computer) return 'draw';

    if (
      (player === 'rock' && computer === 'scissors') ||
      (player === 'paper' && computer === 'rock') ||
      (player === 'scissors' && computer === 'paper')
    ) {
      return 'player';
    }

    return 'computer';
  }

  /**
   * Disables or enables the three choice buttons
   */
  function setButtonsDisabled(disabled) {
    choiceButtons.forEach(function (btn) {
      btn.disabled = disabled;
    });
  }

  /**
   * Removes all reaction animation classes
   */
  function clearAnimations() {
    playerBox.classList.remove('winner-bounce', 'loser-shake', 'shake');
    computerBox.classList.remove('winner-bounce', 'loser-shake', 'shake');
  }

  /**
   * Resets both character boxes to the smiling Font Awesome icon.
   */
  function resetCharactersToSmile() {
    playerEmoji.innerHTML = SMILE_ICON_HTML;
    computerEmoji.innerHTML = SMILE_ICON_HTML;
  }

  /**
   * Updates the scoreboard UI
   */
  function updateScoreDisplay() {
    playerScoreDisplay.textContent = playerScore;
    computerScoreDisplay.textContent = computerScore;
  }

  // ---------- CORE GAME FUNCTIONS ----------

  /**
   * Runs a 3-2-1-GO! countdown, then calls the callback.
   */
  function runCountdown(callback) {
    let count = 3;

    function showCount(text) {
      resultMessage.textContent = text;
      resultMessage.classList.remove('countdown-pop');
      // Force reflow to restart animation
      void resultMessage.offsetWidth;
      resultMessage.classList.add('countdown-pop');
    }

    showCount(count);

    const interval = setInterval(function () {
      count = count - 1;

      if (count > 0) {
        showCount(count);
      } else if (count === 0) {
        showCount('GO!');
      } else {
        clearInterval(interval);
        resultMessage.classList.remove('countdown-pop');
        callback();
      }
    }, 650);
  }

  /**
   * Applies winner/loser/draw reactions and updates the result message.
   * Also triggers the "I'm the winner!" voice on a win (not on draw).
   */
  function showResult(winner) {
    // Clear previous animations
    clearAnimations();

    if (winner === 'player') {
      resultMessage.textContent = '🎉 YOU WIN!';
      playerEmoji.innerHTML = REACTION_FACES.happy;
      computerEmoji.innerHTML = REACTION_FACES.sad;
      playerBox.classList.add('winner-bounce');
      computerBox.classList.add('loser-shake');
      // Voice — player wins
      speak("I'm the winner!");

    } else if (winner === 'computer') {
      resultMessage.textContent = '😢 YOU LOSE!';
      playerEmoji.innerHTML = REACTION_FACES.sad;
      computerEmoji.innerHTML = REACTION_FACES.happy;
      computerBox.classList.add('winner-bounce');
      playerBox.classList.add('loser-shake');
      // Voice — computer wins
      speak("I'm the winner!");

    } else {
      // Draw — no voice
      resultMessage.textContent = '🤝 DRAW!';
      playerEmoji.innerHTML = REACTION_FACES.neutral;
      computerEmoji.innerHTML = REACTION_FACES.neutral;
      playerBox.classList.add('winner-bounce');
      computerBox.classList.add('winner-bounce');
    }
  }

  /**
   * Updates the score based on the winner.
   */
  function updateScore(winner) {
    if (winner === 'player') {
      playerScore = playerScore + 1;
    } else if (winner === 'computer') {
      computerScore = computerScore + 1;
    }
    // draw: no score change
    updateScoreDisplay();
  }

  /**
   * Main game function — called when a choice button is clicked.
   */
  function playGame(playerChoice) {
    if (isAnimating || roundComplete) return;

    isAnimating = true;
    setButtonsDisabled(true);
    playAgainBtn.classList.add('hidden');
    clearAnimations();

    // Shake both characters during the countdown
    playerBox.classList.add('shake');
    computerBox.classList.add('shake');

    runCountdown(function () {
      // Stop shake
      playerBox.classList.remove('shake');
      computerBox.classList.remove('shake');

      const computerChoice = getComputerChoice();

      // Show the chosen emojis briefly (Rock/Paper/Scissors)
      playerEmoji.textContent = choiceEmojis[playerChoice];
      computerEmoji.textContent = choiceEmojis[computerChoice];

      const winner = determineWinner(playerChoice, computerChoice);

      // Update score
      updateScore(winner);

      // Small delay so the player sees the chosen emojis before reactions
      setTimeout(function () {
        showResult(winner);
        setButtonsDisabled(false);
        playAgainBtn.classList.remove('hidden');
        isAnimating = false;
        roundComplete = true;
      }, 350);
    });
  }

  /**
   * Resets ONLY the current round — keeps scores intact.
   */
  function playAgain() {
    // Stop any ongoing speech so the next round can speak cleanly
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Reset both characters to the smiling Font Awesome icon
    resetCharactersToSmile();

    // Reset result message
    resultMessage.textContent = 'PICK ONE!';
    resultMessage.classList.remove('countdown-pop');

    // Remove all animations
    clearAnimations();

    // Hide Play Again
    playAgainBtn.classList.add('hidden');

    // Re-enable buttons
    setButtonsDisabled(false);

    // Reset flags
    isAnimating = false;
    roundComplete = false;

    // Scores remain unchanged — that's the requirement
  }

  // ---------- CHOICE EMOJI MAP (for the brief reveal before reactions) ----------
  const choiceEmojis = {
    rock: '🪨',
    paper: '📄',
    scissors: '✂️'
  };

  // ---------- EVENT LISTENERS ----------
  rockBtn.addEventListener('click', function () {
    playGame('rock');
  });

  paperBtn.addEventListener('click', function () {
    playGame('paper');
  });

  scissorsBtn.addEventListener('click', function () {
    playGame('scissors');
  });

  playAgainBtn.addEventListener('click', playAgain);

  // Keyboard shortcuts: 1, 2, 3
  window.addEventListener('keydown', function (e) {
    if (isAnimating || roundComplete) return;

    if (e.key === '1') {
      playGame('rock');
      e.preventDefault();
    } else if (e.key === '2') {
      playGame('paper');
      e.preventDefault();
    } else if (e.key === '3') {
      playGame('scissors');
      e.preventDefault();
    }
  });

  // ---------- INIT ----------
  function initGame() {
    playerScore = 0;
    computerScore = 0;
    updateScoreDisplay();
    resetCharactersToSmile();
    resultMessage.textContent = 'PICK ONE!';
    playAgainBtn.classList.add('hidden');
    setButtonsDisabled(false);
    clearAnimations();
    isAnimating = false;
    roundComplete = false;
  }

  initGame();

})();