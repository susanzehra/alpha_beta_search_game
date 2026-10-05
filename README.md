# Susan Zehra's Alpha-Beta Search Challenge

A browser-based learning game that introduces alpha-beta pruning through seven progressively harder activities:

1. Match MAX, MIN, alpha, and beta to their meanings.
2. Decide when a branch should be pruned.
3. Trace a small alpha-beta search tree step by step.
4. Reorder moves to increase the number of cutoffs.
5. Play two levels of Orbital Connect against a depth-limited alpha-beta opponent.
6. Build clear, high-level alpha-beta pseudocode from correct and distracting lines.
7. Construct a more detailed recursive version that handles both MAX and MIN.

The final screen provides a personalized completion certificate that can be printed or saved as a PDF.

## Privacy

The learner's name is used only in the current browser session to personalize the certificate. The site has no database, analytics, cookies, password, visitor counter, or network submission. Nothing entered by the learner is stored or transmitted.

## Publish with GitHub Pages

1. Create a new GitHub repository, for example `alpha-beta-search-challenge`.
2. Upload `index.html`, `style.css`, `script.js`, `README.md`, and `LICENSE.txt` to the repository root.
3. Open the repository's **Settings**.
4. Select **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and the `/ (root)` folder, then click **Save**.
7. Wait a few minutes and open the web address displayed by GitHub Pages.

No installation, build command, server, or API key is required.

## Local preview

Open `index.html` directly in a modern browser. For a local web server, run one of these commands from the project folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Files

- `index.html` — page structure and activity content
- `style.css` — responsive visual design and print-ready certificate
- `script.js` — activity logic, alpha-beta search, and connection game
- `LICENSE.txt` — source-code use restrictions

Copyright © 2026 Susan Zehra. All rights reserved.
