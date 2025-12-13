# PromiseTracker Europe (static, no-build)

This is a **static** hash-router SPA meant to work well on **GitHub Pages**.

## Run locally

```bash
# from the project root
python -m http.server 8000
```

Then open: `http://localhost:8000`

## Deploy on GitHub Pages

1. Push this folder to a GitHub repository
2. In GitHub: **Settings → Pages**
3. Choose **Deploy from a branch**
4. Select your branch (e.g. `main`) and `/root`
5. Save — your site will appear at the provided Pages URL

Because routing is hash-based (`#/country/albania`), it works without server rewrites.

## Notes

- **EU is treated as a country** at `#/country/eu`.
- Countries without datasets show a placeholder government and empty promises (ready to be filled).
- Citizen Pulse and Chat/Voting are stored **locally** in your browser (demo mode).

## Folder structure

- `index.html` – app shell
- `assets/data.js` – countries list + seeded Albania/Norway + EU placeholder data
- `assets/app.js` – router + charts + event wiring
- `assets/ui.js` – UI templates
- `assets/store.js` – localStorage utilities
- `assets/styles.css` – minimal styles + legacy prototype CSS
