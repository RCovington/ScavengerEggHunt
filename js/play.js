var puzzleData = null;
var timerInterval = null;

document.addEventListener('DOMContentLoaded', loadPuzzle);

function loadPuzzle() {
    var hash = window.location.hash.substring(1);
    if (!hash) {
        document.getElementById('puzzle-content').innerHTML =
            '<div class="error-message">' +
            '<h2>&#x1F95A; No Puzzle Found</h2>' +
            '<p>Scan a QR code to start your egg hunt!</p>' +
            '</div>';
        return;
    }

    try {
        var data = CryptoUtils.decodePayload(hash);
        displayPuzzle(data);
    } catch (e) {
        document.getElementById('puzzle-content').innerHTML =
            '<div class="error-message">' +
            '<h2>&#x26A0;&#xFE0F; Invalid Puzzle</h2>' +
            '<p>This QR code doesn\'t contain valid puzzle data.</p>' +
            '</div>';
    }
}

function displayPuzzle(data) {
    puzzleData = data;

    // Set header info
    document.getElementById('game-name').textContent = data.g || 'Easter Egg Hunt';
    document.getElementById('puzzle-number').textContent = 'Puzzle ' + data.n + ' of ' + data.t;

    // Build puzzle display
    var html = '';
    if (data.p) {
        html += '<p class="puzzle-text">' + escapeHtml(data.p) + '</p>';
    }
    if (data.i && isValidImageUrl(data.i)) {
        html += '<img class="puzzle-image" src="' + escapeHtml(data.i) + '" alt="Puzzle image" onerror="this.style.display=\'none\'">';
    }
    document.getElementById('puzzle-content').innerHTML = html;

    // Check for active cooldown
    var cooldownEnd = getCooldownEnd();
    if (cooldownEnd && Date.now() < cooldownEnd) {
        startTimer(cooldownEnd);
    } else {
        showAnswerForm();
    }
}

function showAnswerForm() {
    document.getElementById('answer-section').classList.remove('hidden');
    document.getElementById('timer-section').classList.add('hidden');
    document.getElementById('riddle-section').classList.add('hidden');
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').focus();
}

async function submitAnswer() {
    var answerInput = document.getElementById('answer-input');
    var answer = answerInput.value.trim();
    if (!answer) return;

    var btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Checking...';

    // Try to decrypt the riddle using the submitted answer
    var riddle = null;
    if (puzzleData.w) {
        // Wildcard: any answer accepted, decrypt with '*'
        riddle = await CryptoUtils.decrypt(puzzleData.ea[0], '*');
    } else if (puzzleData.ea) {
        // Multiple encrypted copies (one per valid answer)
        for (var i = 0; i < puzzleData.ea.length && !riddle; i++) {
            riddle = await CryptoUtils.decrypt(puzzleData.ea[i], answer);
        }
    } else {
        // Legacy single-answer format
        riddle = await CryptoUtils.decrypt(
            { e: puzzleData.e, iv: puzzleData.iv, s: puzzleData.s },
            answer
        );
    }

    btn.disabled = false;
    btn.textContent = 'Submit Answer';

    if (riddle) {
        showRiddle(riddle);
    } else {
        var cooldownEnd = Date.now() + 3 * 60 * 1000; // 3 minutes
        setCooldownEnd(cooldownEnd);
        startTimer(cooldownEnd);
    }
}

function showRiddle(riddle) {
    document.getElementById('answer-section').classList.add('hidden');
    document.getElementById('timer-section').classList.add('hidden');
    document.getElementById('riddle-section').classList.remove('hidden');

    var isLast = puzzleData.n === puzzleData.t;

    var html = '<h2>&#x1F389; Correct!</h2>';
    if (isLast) {
        html += '<p class="congrats">&#x1F3C6; Congratulations! You\'ve completed the hunt!</p>';
        html += '<p class="riddle-label">Here\'s your final clue to find the prize:</p>';
    } else {
        html += '<p class="riddle-label">Here\'s your clue to find the next egg:</p>';
    }
    html += '<p class="riddle-text">' + escapeHtml(riddle) + '</p>';

    document.getElementById('riddle-content').innerHTML = html;

    clearCooldown();
    createConfetti();
}

function startTimer(endTime) {
    document.getElementById('answer-section').classList.add('hidden');
    document.getElementById('timer-section').classList.remove('hidden');
    document.getElementById('riddle-section').classList.add('hidden');

    if (timerInterval) clearInterval(timerInterval);

    function update() {
        var remaining = endTime - Date.now();
        if (remaining <= 0) {
            clearInterval(timerInterval);
            showAnswerForm();
            return;
        }
        var minutes = Math.floor(remaining / 60000);
        var seconds = Math.floor((remaining % 60000) / 1000);
        document.getElementById('timer-display').textContent =
            minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    update();
    timerInterval = setInterval(update, 1000);
}

// ---- Cooldown Persistence ----

function getPuzzleId() {
    return 'eggcd_' + simpleHash(window.location.hash);
}

function getCooldownEnd() {
    var stored = localStorage.getItem(getPuzzleId());
    return stored ? parseInt(stored, 10) : null;
}

function setCooldownEnd(time) {
    localStorage.setItem(getPuzzleId(), time.toString());
}

function clearCooldown() {
    localStorage.removeItem(getPuzzleId());
}

function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// ---- Confetti ----

function createConfetti() {
    var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bb5', '#c77dff'];
    var container = document.getElementById('confetti-container');
    if (!container) return;

    for (var i = 0; i < 60; i++) {
        var piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 3 + 's';
        piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(piece);
    }

    setTimeout(function () { container.innerHTML = ''; }, 5000);
}

// ---- Keyboard ----

document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        var answerSection = document.getElementById('answer-section');
        if (answerSection && !answerSection.classList.contains('hidden')) {
            submitAnswer();
        }
    }
});
