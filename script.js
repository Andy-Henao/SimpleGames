const switchTttButton = document.getElementById('switch-ttt');
const switchFlappyButton = document.getElementById('switch-flappy');
const tttPanel = document.getElementById('ttt-game');
const flappyPanel = document.getElementById('flappy-game');

const cells = document.querySelectorAll('.cell');
const boardElement = document.querySelector('.board');
const winLine = document.getElementById('win-line');
const statusText = document.getElementById('status');
const restartButton = document.getElementById('restart');
const tttModeSelect = document.getElementById('ttt-mode');
const tttDifficultySelect = document.getElementById('ttt-difficulty');
const difficultyRow = document.getElementById('difficulty-row');

const flappyCanvas = document.getElementById('flappy-canvas');
const flappyContext = flappyCanvas.getContext('2d');
const flappyStatus = document.getElementById('flappy-status');
const flappyScore = document.getElementById('flappy-score');
const flappyHighScore = document.getElementById('flappy-high-score');
const flappyStartButton = document.getElementById('flappy-start');
const flappyResetButton = document.getElementById('flappy-reset');

const winningCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;
let activeWinningCombo = null;
let tttMode = 'human';
let botDifficulty = 'easy';
let botThinking = false;

const bird = {
  x: 90,
  y: flappyCanvas.height / 2,
  radius: 15,
  velocity: 0,
  lift: -8,
  gravity: 0.38,
  maxFall: 7.2
};

const pipes = [];
let flappyIsRunning = false;
let flappyAnimationId = null;
let flappyScoreValue = 0;
let flappyHighScoreValue = 0;
let flappyTick = 0;
let flappyLastTimestamp = 0;

const pipeConfig = {
  width: 62,
  gap: 158,
  speed: 2.5,
  spawnEveryTicks: 92,
  minTopHeight: 65,
  color: '#2f7f53',
  edge: '#1b5638'
};

function showPanel(panelName) {
  const showTtt = panelName === 'ttt';
  tttPanel.classList.toggle('hidden', !showTtt);
  tttPanel.setAttribute('aria-hidden', String(!showTtt));

  flappyPanel.classList.toggle('hidden', showTtt);
  flappyPanel.setAttribute('aria-hidden', String(showTtt));

  switchTttButton.classList.toggle('active', showTtt);
  switchTttButton.setAttribute('aria-pressed', String(showTtt));

  switchFlappyButton.classList.toggle('active', !showTtt);
  switchFlappyButton.setAttribute('aria-pressed', String(!showTtt));
}

function handleCellClick(event) {
  const cell = event.target;
  const index = Number(cell.dataset.index);

  if (!gameActive || board[index] !== '' || botThinking) {
    return;
  }

  if (tttMode === 'bot' && currentPlayer === 'O') {
    return;
  }

  playTurn(index);
}

function playTurn(index) {
  placeMark(index, currentPlayer);

  const winningCombo = getWinningCombo(currentPlayer);
  if (winningCombo) {
    activeWinningCombo = winningCombo;
    if (tttMode === 'bot') {
      statusText.textContent = currentPlayer === 'X' ? 'You win!' : 'Bot wins!';
    } else {
      statusText.textContent = `Player ${currentPlayer} wins!`;
    }
    drawWinLine(winningCombo);
    endGame();
    return;
  }

  if (board.every((mark) => mark !== '')) {
    statusText.textContent = "It's a draw!";
    endGame();
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

  if (tttMode === 'bot' && currentPlayer === 'O') {
    statusText.textContent = 'Bot is thinking...';
    runBotTurn();
    return;
  }

  updateTicTacToeStatus();
}

function placeMark(index, player) {
  board[index] = player;
  cells[index].textContent = player;
  cells[index].classList.add(player.toLowerCase());
}

function runBotTurn() {
  botThinking = true;

  setTimeout(() => {
    if (!gameActive || currentPlayer !== 'O') {
      botThinking = false;
      return;
    }

    const move = getBotMove();
    botThinking = false;
    if (move !== null) {
      playTurn(move);
    }
  }, 380);
}

function getBotMove() {
  const emptyIndices = board
    .map((mark, index) => ({ mark, index }))
    .filter((entry) => entry.mark === '')
    .map((entry) => entry.index);

  if (emptyIndices.length === 0) {
    return null;
  }

  if (botDifficulty === 'easy') {
    return randomChoice(emptyIndices);
  }

  const winningMove = findCriticalMove('O');
  if (winningMove !== null) {
    return winningMove;
  }

  const blockingMove = findCriticalMove('X');
  if (blockingMove !== null) {
    return blockingMove;
  }

  if (board[4] === '') {
    return 4;
  }

  const corners = [0, 2, 6, 8].filter((index) => board[index] === '');
  if (corners.length > 0) {
    return randomChoice(corners);
  }

  return randomChoice(emptyIndices);
}

function findCriticalMove(player) {
  for (const combo of winningCombos) {
    const marks = combo.map((index) => board[index]);
    const playerMarks = marks.filter((mark) => mark === player).length;
    const emptyMarks = marks.filter((mark) => mark === '').length;
    if (playerMarks === 2 && emptyMarks === 1) {
      const emptyIndexInCombo = marks.findIndex((mark) => mark === '');
      return combo[emptyIndexInCombo];
    }
  }

  return null;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getWinningCombo(player) {
  return winningCombos.find((combo) => {
    return combo.every((index) => board[index] === player);
  }) || null;
}

function endGame() {
  gameActive = false;
  cells.forEach((cell) => {
    cell.disabled = true;
  });
}

function drawWinLine(combo) {
  const firstCell = cells[combo[0]];
  const lastCell = cells[combo[2]];
  const boardRect = boardElement.getBoundingClientRect();
  const firstRect = firstCell.getBoundingClientRect();
  const lastRect = lastCell.getBoundingClientRect();

  const startX = firstRect.left + firstRect.width / 2 - boardRect.left;
  const startY = firstRect.top + firstRect.height / 2 - boardRect.top;
  const endX = lastRect.left + lastRect.width / 2 - boardRect.left;
  const endY = lastRect.top + lastRect.height / 2 - boardRect.top;

  const lineLength = Math.hypot(endX - startX, endY - startY);
  const lineAngle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

  winLine.style.width = `${lineLength}px`;
  winLine.style.transform = `translate(${startX}px, ${startY - 3}px) rotate(${lineAngle}deg)`;
  winLine.classList.add('show');
}

function clearWinLine() {
  winLine.classList.remove('show');
  winLine.style.width = '0';
  winLine.style.transform = 'translate(0, 0) rotate(0deg)';
}

function resetTicTacToe() {
  board = Array(9).fill('');
  currentPlayer = 'X';
  gameActive = true;
  activeWinningCombo = null;
  botThinking = false;
  updateTicTacToeStatus();
  clearWinLine();

  cells.forEach((cell) => {
    cell.textContent = '';
    cell.disabled = false;
    cell.classList.remove('x', 'o');
  });
}

function updateTicTacToeStatus() {
  if (tttMode === 'bot') {
    statusText.textContent = currentPlayer === 'X' ? 'Your turn (X)' : 'Bot turn (O)';
    return;
  }

  statusText.textContent = `Player ${currentPlayer}'s turn`;
}

function updateBotDifficultyVisibility() {
  difficultyRow.classList.toggle('hidden', tttMode !== 'bot');
}

function resetFlappyState() {
  pipes.length = 0;
  bird.y = flappyCanvas.height / 2;
  bird.velocity = 0;
  flappyScoreValue = 0;
  flappyTick = 0;
  flappyLastTimestamp = 0;
  flappyScore.textContent = 'Score: 0';
  flappyHighScore.textContent = `High Score: ${flappyHighScoreValue}`;
}

function stopFlappy() {
  flappyIsRunning = false;
  if (flappyAnimationId !== null) {
    cancelAnimationFrame(flappyAnimationId);
    flappyAnimationId = null;
  }
}

function startFlappy() {
  resetFlappyState();
  flappyStartButton.classList.add('hidden');
  flappyStatus.textContent = 'Flappy Bird is running. Press Space or click canvas to flap.';
  flappyIsRunning = true;
  renderFlappyScene();
  flappyAnimationId = requestAnimationFrame(updateFlappy);
}

function createPipe() {
  const maxTopHeight = flappyCanvas.height - pipeConfig.gap - pipeConfig.minTopHeight;
  const topHeight = pipeConfig.minTopHeight + Math.random() * (maxTopHeight - pipeConfig.minTopHeight);

  pipes.push({
    x: flappyCanvas.width,
    topHeight,
    passed: false
  });
}

function flapBird() {
  if (!flappyIsRunning) {
    return;
  }

  bird.velocity = bird.lift;
}

function updateFlappy(timestamp) {
  if (!flappyIsRunning) {
    return;
  }

  if (!flappyLastTimestamp) {
    flappyLastTimestamp = timestamp;
  }

  flappyTick += 1;
  if (flappyTick % pipeConfig.spawnEveryTicks === 0) {
    createPipe();
  }

  bird.velocity = Math.min(bird.velocity + bird.gravity, bird.maxFall);
  bird.y += bird.velocity;

  pipes.forEach((pipe) => {
    pipe.x -= pipeConfig.speed;

    if (!pipe.passed && pipe.x + pipeConfig.width < bird.x - bird.radius) {
      pipe.passed = true;
      flappyScoreValue += 1;
      flappyScore.textContent = `Score: ${flappyScoreValue}`;
      if (flappyScoreValue > flappyHighScoreValue) {
        flappyHighScoreValue = flappyScoreValue;
        flappyHighScore.textContent = `High Score: ${flappyHighScoreValue}`;
      }
    }
  });

  while (pipes.length > 0 && pipes[0].x + pipeConfig.width < 0) {
    pipes.shift();
  }

  if (hasFlappyCollision()) {
    stopFlappy();
    flappyStartButton.textContent = 'Play Again';
    flappyStartButton.classList.remove('hidden');
    flappyStatus.textContent = `Game over! Your score is ${flappyScoreValue}. Press Start to play again.`;
    renderFlappyScene();
    return;
  }

  renderFlappyScene();
  flappyAnimationId = requestAnimationFrame(updateFlappy);
}

function hasFlappyCollision() {
  if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= flappyCanvas.height) {
    return true;
  }

  return pipes.some((pipe) => {
    const inPipeX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipeConfig.width;
    if (!inPipeX) {
      return false;
    }

    const inTopPipe = bird.y - bird.radius < pipe.topHeight;
    const inBottomPipe = bird.y + bird.radius > pipe.topHeight + pipeConfig.gap;
    return inTopPipe || inBottomPipe;
  });
}

function renderFlappyScene() {
  flappyContext.clearRect(0, 0, flappyCanvas.width, flappyCanvas.height);

  const sky = flappyContext.createLinearGradient(0, 0, 0, flappyCanvas.height);
  sky.addColorStop(0, '#89d2ff');
  sky.addColorStop(1, '#dff5ff');
  flappyContext.fillStyle = sky;
  flappyContext.fillRect(0, 0, flappyCanvas.width, flappyCanvas.height);

  flappyContext.fillStyle = '#a5da7a';
  flappyContext.fillRect(0, flappyCanvas.height - 42, flappyCanvas.width, 42);

  pipes.forEach((pipe) => {
    drawPipe(pipe.x, 0, pipeConfig.width, pipe.topHeight);
    drawPipe(
      pipe.x,
      pipe.topHeight + pipeConfig.gap,
      pipeConfig.width,
      flappyCanvas.height - (pipe.topHeight + pipeConfig.gap)
    );
  });

  drawBird();
}

function drawPipe(x, y, width, height) {
  flappyContext.fillStyle = pipeConfig.color;
  flappyContext.fillRect(x, y, width, height);
  flappyContext.strokeStyle = pipeConfig.edge;
  flappyContext.lineWidth = 3;
  flappyContext.strokeRect(x, y, width, height);
}

function drawBird() {
  flappyContext.save();
  flappyContext.translate(bird.x, bird.y);
  flappyContext.rotate(Math.max(-0.35, Math.min(0.35, bird.velocity * 0.06)));

  flappyContext.fillStyle = '#ffbf3f';
  flappyContext.beginPath();
  flappyContext.arc(0, 0, bird.radius, 0, Math.PI * 2);
  flappyContext.fill();

  flappyContext.fillStyle = '#ef8f00';
  flappyContext.beginPath();
  flappyContext.moveTo(8, -2);
  flappyContext.lineTo(20, 3);
  flappyContext.lineTo(8, 8);
  flappyContext.closePath();
  flappyContext.fill();

  flappyContext.fillStyle = '#fff';
  flappyContext.beginPath();
  flappyContext.arc(-4, -4, 4.5, 0, Math.PI * 2);
  flappyContext.fill();

  flappyContext.fillStyle = '#1f222b';
  flappyContext.beginPath();
  flappyContext.arc(-3, -4, 2.1, 0, Math.PI * 2);
  flappyContext.fill();

  flappyContext.restore();
}

cells.forEach((cell) => {
  cell.addEventListener('click', handleCellClick);
});

restartButton.addEventListener('click', resetTicTacToe);

tttModeSelect.addEventListener('change', () => {
  tttMode = tttModeSelect.value;
  updateBotDifficultyVisibility();
  resetTicTacToe();
});

tttDifficultySelect.addEventListener('change', () => {
  botDifficulty = tttDifficultySelect.value;
  if (tttMode === 'bot') {
    resetTicTacToe();
  }
});

switchTttButton.addEventListener('click', () => {
  showPanel('ttt');
});

switchFlappyButton.addEventListener('click', () => {
  showPanel('flappy');
});

flappyStartButton.addEventListener('click', startFlappy);

flappyResetButton.addEventListener('click', () => {
  stopFlappy();
  resetFlappyState();
  flappyStartButton.textContent = 'Start Flappy Bird';
  flappyStartButton.classList.remove('hidden');
  flappyStatus.textContent = 'Click Start in the middle, then hit Space to flap';
  renderFlappyScene();
});

flappyCanvas.addEventListener('click', flapBird);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    flapBird();
  }
});

window.addEventListener('resize', () => {
  if (activeWinningCombo) {
    drawWinLine(activeWinningCombo);
  }
});

resetTicTacToe();
updateBotDifficultyVisibility();
resetFlappyState();
flappyStartButton.classList.remove('hidden');
renderFlappyScene();
