let games = JSON.parse(localStorage.getItem('eggHuntGames') || '[]');
let currentGameIndex = -1;
let editingPuzzleIndex = -1;

document.addEventListener('DOMContentLoaded', init);

function init() {
    const passwordHash = localStorage.getItem('eggHuntPassword');
    if (!passwordHash) {
        showSection('setup-section');
    } else {
        showSection('login-section');
    }
}

// ---- Section Management ----

function showSection(id) {
    document.querySelectorAll('.section').forEach(function (s) {
        s.classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');

    var logoutBtn = document.getElementById('logout-btn');
    var isAuth = id !== 'login-section' && id !== 'setup-section';
    logoutBtn.classList.toggle('hidden', !isAuth);

    // Auto-detect base URL when entering editor
    if (id === 'editor-section') {
        detectBaseUrl();
    }
}

function detectBaseUrl() {
    var input = document.getElementById('base-url');
    if (input && !input.value) {
        var url = window.location.href;
        input.value = url.substring(0, url.lastIndexOf('/'));
    }
}

// ---- Auth ----

async function setupPassword() {
    var pw = document.getElementById('setup-password').value;
    var confirm = document.getElementById('setup-confirm').value;
    if (!pw) { alert('Please enter a password.'); return; }
    if (pw !== confirm) { alert('Passwords do not match.'); return; }
    var hash = await CryptoUtils.hash(pw);
    localStorage.setItem('eggHuntPassword', hash);
    showSection('login-section');
}

async function login() {
    var pw = document.getElementById('login-password').value;
    if (!pw) return;
    var hash = await CryptoUtils.hash(pw);
    var stored = localStorage.getItem('eggHuntPassword');
    if (hash === stored) {
        renderGamesList();
        showSection('games-section');
    } else {
        alert('Incorrect password.');
    }
}

function logout() {
    document.getElementById('login-password').value = '';
    showSection('login-section');
}

// ---- Games ----

function renderGamesList() {
    var list = document.getElementById('games-list');
    if (games.length === 0) {
        list.innerHTML = '<p class="empty-state">No hunts created yet. Create your first one!</p>';
        return;
    }
    list.innerHTML = games.map(function (game, i) {
        return '<div class="game-card" onclick="selectGame(' + i + ')">' +
            '<h3>&#x1F95A; ' + escapeHtml(game.name) + '</h3>' +
            '<p>' + game.puzzles.length + ' puzzle' + (game.puzzles.length !== 1 ? 's' : '') + '</p>' +
            '<p class="game-date">Created: ' + escapeHtml(game.created) + '</p>' +
            '<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteGame(' + i + ')">Delete</button>' +
            '</div>';
    }).join('');
}

function createGame() {
    document.getElementById('new-game-name').value = '';
    document.getElementById('csv-upload').value = '';
    showSection('create-game-section');
}

function submitNewGame() {
    var name = document.getElementById('new-game-name').value.trim();
    if (!name) { alert('Please enter a game name.'); return; }

    var duplicate = games.some(function (g) {
        return g.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
        alert('A hunt named "' + name + '" already exists. Please choose a different name.');
        return;
    }

    var fileInput = document.getElementById('csv-upload');
    var file = fileInput.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var puzzles = parsePuzzlesFromCSV(e.target.result);
            if (puzzles === null) return;
            finishCreateGame(name, puzzles);
        };
        reader.readAsText(file);
    } else {
        finishCreateGame(name, []);
    }
}

function finishCreateGame(name, puzzles) {
    games.push({
        name: name,
        created: new Date().toLocaleDateString(),
        puzzles: puzzles
    });
    saveGames();
    selectGame(games.length - 1);
}

function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    while (i < text.length) {
        var ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                field += ch;
                i++;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
                i++;
            } else if (ch === ',') {
                row.push(field.trim());
                field = '';
                i++;
            } else if (ch === '\n' || ch === '\r') {
                row.push(field.trim());
                if (row.some(function (c) { return c !== ''; })) {
                    rows.push(row);
                }
                row = [];
                field = '';
                if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                    i += 2;
                } else {
                    i++;
                }
            } else {
                field += ch;
                i++;
            }
        }
    }
    row.push(field.trim());
    if (row.some(function (c) { return c !== ''; })) {
        rows.push(row);
    }
    return rows;
}

function parsePuzzlesFromCSV(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) {
        alert('CSV must have a header row and at least one data row.');
        return null;
    }
    var header = rows[0].map(function (h) { return h.toLowerCase().replace(/[^a-z]/g, ''); });
    var dataRows = rows.slice(1);

    var colPuzzle = header.indexOf('puzzle');
    var colAnswer = header.findIndex(function (h) { return h === 'puzzleanswer' || h === 'puzzleanswers'; });
    var colExplanation = header.findIndex(function (h) { return h === 'puzzleexplanation' || h === 'explanation'; });
    var colRiddle = header.indexOf('riddle');
    var colRiddleAnswer = header.findIndex(function (h) { return h === 'riddleanswer'; });

    if (colPuzzle < 0 || colAnswer < 0 || colRiddle < 0 || colRiddleAnswer < 0) {
        alert('CSV must have columns: Puzzle, Puzzle Answer, Riddle, and Riddle Answer.\nFound headers: ' + rows[0].join(', '));
        return null;
    }

    var puzzles = [];
    for (var r = 0; r < dataRows.length; r++) {
        var drow = dataRows[r];
        var puzzle = (drow[colPuzzle] || '').trim();
        var answer = (drow[colAnswer] || '').trim();
        var riddle = (drow[colRiddle] || '').trim();
        var riddleAnswer = (drow[colRiddleAnswer] || '').trim();
        var explanation = colExplanation >= 0 ? (drow[colExplanation] || '').trim() : '';

        if (!puzzle || !answer || !riddle || !riddleAnswer) {
            continue;
        }
        puzzles.push({
            puzzle: puzzle,
            puzzleImage: '',
            puzzleAnswer: answer,
            puzzleExplanation: explanation,
            riddle: riddle,
            riddleAnswer: riddleAnswer
        });
    }

    if (puzzles.length === 0) {
        alert('No valid puzzle rows found in the CSV.');
        return null;
    }
    return puzzles;
}

function downloadCSVTemplate() {
    var csv = 'Number,Puzzle,Puzzle Answer,Puzzle Explanation,Riddle,Riddle Answer\n';
    csv += '1,What has four legs and barks?,dog,Dogs are common pets that bark,Find where children play,The playground\n';
    csv += '2,"What is 2 + 2?","4, four",Basic addition,Look by the big red door,The barn\n';
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'egg_hunt_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function deleteGame(index) {
    if (!confirm('Delete "' + games[index].name + '"? This cannot be undone.')) return;
    games.splice(index, 1);
    saveGames();
    renderGamesList();
}

function selectGame(index) {
    currentGameIndex = index;
    editingPuzzleIndex = -1;
    renderEditor();
    showSection('editor-section');
}

function backToGames() {
    currentGameIndex = -1;
    renderGamesList();
    showSection('games-section');
}

function saveGames() {
    localStorage.setItem('eggHuntGames', JSON.stringify(games));
}

// ---- Editor ----

function renderEditor() {
    var game = games[currentGameIndex];
    document.getElementById('editor-title').textContent = game.name;
    renderPuzzlesList();
    clearPuzzleForm();
}

function renderPuzzlesList() {
    var game = games[currentGameIndex];
    var list = document.getElementById('puzzles-list');
    if (game.puzzles.length === 0) {
        list.innerHTML = '<p class="empty-state">No puzzles yet. Add your first puzzle below!</p>';
        return;
    }
    list.innerHTML = game.puzzles.map(function (puzzle, i) {
        var location = i === 0 ? 'Start' : game.puzzles[i - 1].riddleAnswer;
        var puzzlePreview = puzzle.puzzle.length > 120 ? puzzle.puzzle.substring(0, 120) + '...' : puzzle.puzzle;
        var riddlePreview = puzzle.riddle.length > 120 ? puzzle.riddle.substring(0, 120) + '...' : puzzle.riddle;
        return '<div class="puzzle-card">' +
            '<div class="puzzle-header">' +
            '<span class="puzzle-number">#' + (i + 1) + '</span>' +
            '<span class="puzzle-location">&#x1F4CD; ' + escapeHtml(location) + '</span>' +
            '</div>' +
            '<div class="puzzle-body">' +
            '<p><strong>Puzzle:</strong> ' + escapeHtml(puzzlePreview) + '</p>' +
            (puzzle.puzzleImage ? '<p><strong>Image:</strong> &#x2713;</p>' : '') +
            '<p><strong>Answer(s):</strong> ' + escapeHtml(puzzle.puzzleAnswer) + '</p>' +
            (puzzle.puzzleExplanation ? '<p><strong>Explanation:</strong> ' + escapeHtml(puzzle.puzzleExplanation) + '</p>' : '') +
            '<p><strong>Riddle:</strong> ' + escapeHtml(riddlePreview) + '</p>' +
            '<p><strong>Next Location:</strong> ' + escapeHtml(puzzle.riddleAnswer) + '</p>' +
            '</div>' +
            '<div class="puzzle-actions">' +
            '<button class="btn btn-sm" onclick="movePuzzle(' + i + ', -1)"' + (i === 0 ? ' disabled' : '') + '>&#x2191; Up</button>' +
            '<button class="btn btn-sm" onclick="movePuzzle(' + i + ', 1)"' + (i === game.puzzles.length - 1 ? ' disabled' : '') + '>&#x2193; Down</button>' +
            '<button class="btn btn-sm btn-secondary" onclick="editPuzzle(' + i + ')">Edit</button>' +
            '<button class="btn btn-sm btn-danger" onclick="deletePuzzle(' + i + ')">Delete</button>' +
            '</div>' +
            '</div>';
    }).join('');
}

function addOrUpdatePuzzle() {
    var puzzle = {
        puzzle: document.getElementById('puzzle-text').value.trim(),
        puzzleImage: document.getElementById('puzzle-image').value.trim(),
        puzzleAnswer: document.getElementById('puzzle-answer').value.trim(),
        puzzleExplanation: document.getElementById('puzzle-explanation').value.trim(),
        riddle: document.getElementById('puzzle-riddle').value.trim(),
        riddleAnswer: document.getElementById('puzzle-riddle-answer').value.trim()
    };

    if (!puzzle.puzzle || !puzzle.puzzleAnswer || !puzzle.riddle || !puzzle.riddleAnswer) {
        alert('Please fill in all required fields (Puzzle, Answer, Riddle, and Riddle Answer).');
        return;
    }

    var game = games[currentGameIndex];
    if (editingPuzzleIndex >= 0) {
        game.puzzles[editingPuzzleIndex] = puzzle;
        editingPuzzleIndex = -1;
    } else {
        game.puzzles.push(puzzle);
    }
    saveGames();
    clearPuzzleForm();
    renderPuzzlesList();
}

function editPuzzle(index) {
    var puzzle = games[currentGameIndex].puzzles[index];
    editingPuzzleIndex = index;
    document.getElementById('puzzle-text').value = puzzle.puzzle;
    document.getElementById('puzzle-image').value = puzzle.puzzleImage || '';
    document.getElementById('puzzle-answer').value = puzzle.puzzleAnswer;
    document.getElementById('puzzle-explanation').value = puzzle.puzzleExplanation || '';
    document.getElementById('puzzle-riddle').value = puzzle.riddle;
    document.getElementById('puzzle-riddle-answer').value = puzzle.riddleAnswer;
    document.getElementById('form-title').textContent = 'Edit Puzzle #' + (index + 1);
    document.getElementById('form-submit-btn').textContent = 'Update Puzzle';
    document.getElementById('form-cancel-btn').classList.remove('hidden');
    document.querySelector('.puzzle-form-card').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    clearPuzzleForm();
}

function clearPuzzleForm() {
    document.getElementById('puzzle-text').value = '';
    document.getElementById('puzzle-image').value = '';
    document.getElementById('puzzle-answer').value = '';
    document.getElementById('puzzle-explanation').value = '';
    document.getElementById('puzzle-riddle').value = '';
    document.getElementById('puzzle-riddle-answer').value = '';
    document.getElementById('form-title').textContent = 'Add New Puzzle';
    document.getElementById('form-submit-btn').textContent = 'Add Puzzle';
    document.getElementById('form-cancel-btn').classList.add('hidden');
    editingPuzzleIndex = -1;
}

function deletePuzzle(index) {
    if (!confirm('Delete this puzzle?')) return;
    games[currentGameIndex].puzzles.splice(index, 1);
    saveGames();
    renderPuzzlesList();
}

function movePuzzle(index, direction) {
    var puzzles = games[currentGameIndex].puzzles;
    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= puzzles.length) return;
    var temp = puzzles[index];
    puzzles[index] = puzzles[newIndex];
    puzzles[newIndex] = temp;
    saveGames();
    renderPuzzlesList();
}

// ---- Output Generation ----

async function generateOutput() {
    var game = games[currentGameIndex];
    if (game.puzzles.length === 0) {
        alert('Add at least one puzzle first.');
        return;
    }
    var baseUrl = document.getElementById('base-url').value.trim().replace(/\/+$/, '');
    if (!baseUrl) {
        alert('Please enter the site URL for QR code links.');
        return;
    }

    showSection('output-section');
    document.getElementById('output-title').textContent = game.name;
    renderMasterTable(game);
    await renderQRCodes(game, baseUrl);
}

function renderMasterTable(game) {
    var tbody = document.getElementById('master-table-body');
    var rows = game.puzzles.map(function (puzzle, i) {
        var location = i === 0 ? 'Start' : game.puzzles[i - 1].riddleAnswer;
        return '<tr>' +
            '<td>#' + (i + 1) + '</td>' +
            '<td>' + escapeHtml(location) + '</td>' +
            '<td>' + escapeHtml(puzzle.puzzle) + (puzzle.puzzleImage ? ' <em>[+Image]</em>' : '') + '</td>' +
            '<td>' + escapeHtml(puzzle.puzzleAnswer) + '</td>' +
            '<td>' + escapeHtml(puzzle.puzzleExplanation || '') + '</td>' +
            '<td>' + escapeHtml(puzzle.riddle) + '</td>' +
            '</tr>';
    }).join('');

    var lastAnswer = game.puzzles[game.puzzles.length - 1].riddleAnswer;
    rows += '<tr class="prize-row">' +
        '<td>&#x1F3C6;</td>' +
        '<td>' + escapeHtml(lastAnswer) + '</td>' +
        '<td colspan="4"><em>Final prize / egg location</em></td>' +
        '</tr>';
    tbody.innerHTML = rows;
}

async function renderQRCodes(game, baseUrl) {
    var container = document.getElementById('qr-codes-container');
    container.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Generating QR codes&hellip;</p>';

    // Build all URLs (encrypt riddles)
    var entries = [];
    for (var i = 0; i < game.puzzles.length; i++) {
        var puzzle = game.puzzles[i];
        var isWildcard = puzzle.puzzleAnswer.trim() === '*';
        var encryptedArray = [];
        if (isWildcard) {
            encryptedArray.push(await CryptoUtils.encrypt(puzzle.riddle, '*'));
        } else {
            var answers = puzzle.puzzleAnswer.split(',').map(function (a) { return a.trim(); }).filter(function (a) { return a; });
            for (var a = 0; a < answers.length; a++) {
                encryptedArray.push(await CryptoUtils.encrypt(puzzle.riddle, answers[a]));
            }
        }
        var payload = {
            p: puzzle.puzzle,
            i: puzzle.puzzleImage || '',
            ea: encryptedArray,
            g: game.name,
            n: i + 1,
            t: game.puzzles.length
        };
        if (isWildcard) payload.w = 1;
        var encoded = CryptoUtils.encodePayload(payload);
        var url = baseUrl + '/play.html#' + encoded;
        var location = i === 0 ? 'Start' : game.puzzles[i - 1].riddleAnswer;
        entries.push({ url: url, location: location, index: i });
    }

    // Render QR code cards
    container.innerHTML = entries.map(function (e) {
        return '<div class="qr-card">' +
            '<div class="qr-label">' +
            '<span class="qr-number">#' + (e.index + 1) + '</span>' +
            '<span class="qr-location">&#x1F4CD; ' + escapeHtml(e.location) + '</span>' +
            '</div>' +
            '<div class="qr-code" id="qr-' + e.index + '"></div>' +
            '<button class="btn btn-sm" onclick="downloadQR(\'qr-' + e.index + '\', \'puzzle-' + (e.index + 1) + '\')">&#x2B07; Download</button>' +
            '</div>';
    }).join('');

    // Generate QR code images
    for (var j = 0; j < entries.length; j++) {
        new QRCode(document.getElementById('qr-' + entries[j].index), {
            text: entries[j].url,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }
}

function downloadQR(elementId, filename) {
    var canvas = document.querySelector('#' + elementId + ' canvas');
    if (!canvas) return;
    var link = document.createElement('a');
    link.download = filename + '.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function backToEditor() {
    showSection('editor-section');
}
