const COLUMNS = 18;
const ROW_TEMPLATE = '<input type="checkbox"/>'.repeat(COLUMNS);
const POSSIBLE_DIRECTIONS = ['R', 'L', 'D', 'U'];
let currentDirection = 'R';
let wantedDirection = 'R';

let lastTime = 0;
const SNAKE = [];

const easy = {
  currentScore: 0,
  currentRow: 1,

  // time in ms to move snake forwards
  currentSpeed: 400,

  // initial width of the snake
  currentWidth: 6
}

const hard = {
  ...easy,
  currentSpeed: 200,
  currentWidth: 10
}

let currentSettings = easy;

let game = document.querySelector('.game');
let canvas = document.querySelector('.game-canvas');
let status = document.querySelector('.game-status');
let score = document.querySelector('.game-score');
let modeButton = document.querySelector('.mode');
let restartButton = document.querySelector('.restart');

let rows;
let rowHeight;
let state;

let startTime;

window.onresize = resize;
restartButton.onmousedown = reset;
modeButton.onmousedown = toggleMode;

// add swipe gestures
const swipeGestures = new Hammer(game);
swipeGestures.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
swipeGestures.on('swipeleft', function (ev) {
  wantedDirection = currentDirection !== 'R' ? 'L' : 'R';
});
swipeGestures.on('swiperight', function (ev) {
  wantedDirection = currentDirection !== 'L' ? 'R' : 'L';
});
swipeGestures.on('swipeup', function (ev) {
  wantedDirection = currentDirection !== 'D' ? 'U' : 'D';
});
swipeGestures.on('swipedown', function (ev) {
  wantedDirection = currentDirection !== 'U' ? 'D' : 'U';
});

document.onkeydown = event => {
  if (event.keyCode === 37) wantedDirection = currentDirection !== 'R' ? 'L' : 'R';
  if (event.keyCode === 38) wantedDirection = currentDirection !== 'D' ? 'U' : 'D';
  if (event.keyCode === 39) wantedDirection = currentDirection !== 'L' ? 'R' : 'L';
  if (event.keyCode === 40) wantedDirection = currentDirection !== 'U' ? 'D' : 'U';

  if (event.keyCode === 82) reset();
}

function changeDirection() {
  wantedDirection = POSSIBLE_DIRECTIONS[randomIntFromInterval(0, 3)];
  console.log(wantedDirection);
}

build();
reset();
paint();

function reset() {
  setState('playing');

  rows.forEach(row => row.forEach(box => box.checked = false));

  startTime = Date.now();

  ({
    currentRow,
    currentSpeed,
    currentWidth,
    currentScore,
  } = currentSettings)

  addSnake({
    row: 0,
    index: Math.floor(COLUMNS / 2 - currentWidth / 2),
    width: currentWidth
  });

  score.innerHTML = 'score <em>' + currentScore + '</em>';
  currentDirection = 'R';
  wantedDirection = 'R';
}

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function addSnake(config) {
  SNAKE.length = 0;
  for (let i = config.index; i < config.width + config.index; i++) {
    rows[config.row][i].checked = true;
    SNAKE.push({
      row: config.row,
      pos: i,
      cb: rows[config.row][i]
    });
  }
  placeRandomFood();
}

function resize() {
  if (build()) reset();
}

function click(event) {

  if (!event.type.startsWith('key') && event.target.matches('a, button')) return;

  event.preventDefault();

  if (state === 'playing') {
    step();
  }
  else {
    reset();
  }

}

function setState(value) {
  state = value;

  if (state === 'playing') status.textContent = 'press cursor keys';
  else if (state === 'won') status.textContent = '🏅you rock ✌️🦄';
  else if (state === 'lost') status.textContent = 'checkmate 💥';

}

function toggleMode() {

  if (/easy/i.test(modeButton.textContent)) {
    currentSettings = hard;
    modeButton.textContent = 'hard';
  }
  else {
    currentSettings = easy;
    modeButton.textContent = 'easy';
  }

  reset();

}

function build() {
  let canvasHeight = canvas.offsetHeight;

  // only rebuild if the number of rows has changed
  if (typeof rowHeight === 'number' && rows.length === Math.floor(canvasHeight / rowHeight) - 1) {
    return false;
  }

  rows = [];
  canvas.innerHTML = '';

  let firstRow = generateRow();
  rowHeight = firstRow.offsetHeight;

  Array(Math.floor(canvasHeight / rowHeight) - 2).fill().map(generateRow);
  return true;
}

function generateRow() {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = ROW_TEMPLATE;
  canvas.appendChild(row);
  rows.unshift(Array.from(row.childNodes));

  return row;
}

function moveSnake() {
  const head = SNAKE.slice(-1)[0];
  let headRow;
  let headPos;
  let headCb;

  switch (wantedDirection) {
    case 'R': {
      headPos = head.pos === COLUMNS - 1 ? 0 : head.pos + 1;
      headRow = head.row;
      headCb = rows[headRow][headPos];
      break;
    }
    case 'L': {
      headPos = head.pos === 0 ? COLUMNS - 1 : head.pos - 1;
      headRow = head.row;
      headCb = rows[headRow][headPos];
      break;
    }
    case 'U': {
      headPos = head.pos;
      headRow = head.row === rows.length - 1 ? 0 : head.row + 1;
      headCb = rows[headRow][headPos];
      break;
    }
    case 'D': {
      headPos = head.pos;
      headRow = head.row === 0 ? rows.length - 1 : head.row - 1;
      headCb = rows[headRow][headPos];
      break;
    }
  }
  if (headCb.checked) {
    if (isPartOfSnake(headRow, headPos)) {
      setState('lost');
      return;
    } else {
      currentSettings.currentScore += 1;
      score.innerHTML = 'score <em>' + currentSettings.currentScore + '</em>';
      placeRandomFood();
    }
  } else {
    // remove tail and remove check
    SNAKE.shift().cb.checked = false;
  }

  // add new head
  headCb.checked = true;
  const newHead = {
    row: headRow,
    pos: headPos,
    cb: headCb,
  }
  SNAKE.push(newHead);
  currentDirection = wantedDirection;
}

function placeRandomFood() {
  let randomPos;
  let randomRow;

  function getRandomValues() {
    randomPos = randomIntFromInterval(0, COLUMNS - 1);
    randomRow = randomIntFromInterval(0, rows.length - 1);
  }

  getRandomValues();

  while (isPartOfSnake(randomRow, randomPos)) {
    getRandomValues();
  }

  // mark checkbox for food
  rows[randomRow][randomPos].checked = true;
}

function isPartOfSnake(row, pos) {
  return SNAKE.some(part => part.row === row && part.pos === pos);
}

function paint() {
  if (state === 'playing') {
    if (!lastTime || Date.now() - lastTime >= currentSpeed) {
      lastTime = Date.now();
      moveSnake();
    }
  }

  requestAnimationFrame(paint);
}