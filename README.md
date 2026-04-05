# Easter Egg Scavenger Hunt

A fun, interactive Easter egg scavenger hunt game that runs entirely as a static website — perfect for **GitHub Pages**. Create puzzles, generate QR codes, and let players hunt for Easter eggs in the real world!

## How It Works

### For Hunt Organizers

1. Open `admin.html` and set up a password (first time only)
2. Create a new egg hunt and give it a name
3. Add puzzle sets, each containing:
   - **Puzzle** — A question or challenge (text and/or image)
   - **Answer** — The solution (a number or 1–2 words, case-insensitive)
   - **Riddle** — A clue revealed after solving the puzzle, hinting at where the next QR code is hidden
   - **Riddle Answer** — The actual next location name (for your reference only)
4. Set the **Site URL** to your GitHub Pages URL
5. Click **Generate QR Codes & Table** to produce:
   - A **master reference table** showing all puzzles, answers, and locations
   - **Printable QR codes** labeled with where to place them
6. Print the QR codes, cut them out, and place them at the designated locations!

### For Players

1. Find the first QR code at the **Start** location
2. Scan it with your phone camera
3. Read the puzzle and submit your answer
4. **Correct?** You'll see a riddle hinting at the next QR code location
5. **Wrong?** Wait 3 minutes before trying again
6. Follow the clues from egg to egg until you find the final prize!

## Master Table Format

The organizer's reference table looks like this:

| # | QR Location | Puzzle | Answer | Riddle |
|---|-------------|--------|--------|--------|
| #1 | Start | _puzzle text_ | _answer_ | _riddle text_ |
| #2 | _riddle answer from #1_ | _puzzle text_ | _answer_ | _riddle text_ |
| #3 | _riddle answer from #2_ | _puzzle text_ | _answer_ | _riddle text_ |
| 🏆 | _riddle answer from last_ | _Final prize location_ | | |

## Deploy to GitHub Pages

1. Create a new repository (or fork this one)
2. Push all files to the `main` branch
3. Go to **Settings → Pages**
4. Set source to **Deploy from a branch** → `main` → `/ (root)`
5. Your site will be live at `https://yourusername.github.io/YourRepoName/`
6. Use that URL as the **Site URL** in the admin page when generating QR codes

## Security

- Puzzle answers are **never exposed** in the page source or URL
- Riddles are **encrypted** using the answer as the key (AES-256-GCM)
- Decryption only succeeds with the correct answer — wrong guesses reveal nothing
- Admin password is hashed (SHA-256) before storage
- All cryptography uses the built-in **Web Crypto API**

## Files

```
index.html          Landing page
admin.html          Hunt management (login-protected)
play.html           Player puzzle page (linked from QR codes)
css/style.css       Styles
js/crypto.js        Encryption/decryption utilities
js/admin.js         Admin page logic
js/play.js          Player page logic
.nojekyll           Disables Jekyll processing on GitHub Pages
```

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge) that support the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).

## Tips

- Keep puzzle answers short — numbers or 1–2 words work best
- Write riddles that hint at a physical location without being too obvious
- Test your QR codes before the hunt by scanning them with a phone
- The last puzzle's riddle should point players to the final prize location
- Use the **Download** button on each QR code to save them individually as PNG files
