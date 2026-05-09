# TricTrac PWA — Setup Guide

Everything you need to get your TricTrac app live on the internet,
installable on phones, and playable online with friends.

---

## What you need
- A free GitHub account → https://github.com
- A free Firebase account → https://firebase.google.com
- A free Vercel account → https://vercel.com
- About 30 minutes

---

## Step 1 — Upload the files to GitHub

1. Go to https://github.com and sign in (or create a free account).
2. Click the **+** button (top right) → **New repository**.
3. Name it `trictrac`, set it to **Public**, click **Create repository**.
4. On the next page, click **uploading an existing file**.
5. Drag the entire `trictrac` folder contents into the upload area:
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - `firebase-rules.json`
   - `css/style.css`
   - `js/game.js`
   - `js/ui.js`
   - `js/multiplayer.js`
   - `js/firebase-config.js`
   - `icons/icon-192.png`
   - `icons/icon-512.png`
6. Click **Commit changes**.

---

## Step 2 — Set up Firebase (for multiplayer)

1. Go to https://console.firebase.google.com and sign in.
2. Click **Add project** → name it `trictrac` → click through the setup steps.
3. Once inside your project, click **Realtime Database** in the left menu.
4. Click **Create Database** → choose a region close to you (e.g. `europe-west1`) → **Start in test mode**.
5. Click the **Rules** tab and paste in the contents of `firebase-rules.json`:
   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": {
           ".read": true,
           ".write": true,
           ".validate": "newData.hasChildren(['host', 'status'])"
         }
       }
     }
   }
   ```
   Click **Publish**.
6. Now get your config keys:
   - Click the ⚙️ gear icon → **Project settings**.
   - Scroll down to **Your apps** → click the **</>** (web) icon.
   - Register the app as `trictrac-web` → click **Register app**.
   - Copy the `firebaseConfig` object shown on screen.
7. Open `js/multiplayer.js` in your GitHub repo (click the file → pencil ✏️ icon to edit).
8. Replace the placeholder `firebaseConfig` block at the top with your copied values.
9. Click **Commit changes**.

---

## Step 3 — Deploy to Vercel (free hosting)

1. Go to https://vercel.com and sign in with your GitHub account.
2. Click **Add New → Project**.
3. Find your `trictrac` repository and click **Import**.
4. Leave all settings as default — Vercel will detect it's a static site.
5. Click **Deploy**.
6. In about 30 seconds you'll get a live URL like:
   `https://trictrac-yourname.vercel.app`

That's your app! Share this URL with anyone to play.

---

## Step 4 — Install on your phone

### iPhone / iPad (Safari)
1. Open your Vercel URL in **Safari**.
2. Tap the **Share** button (box with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** — the TricTrac icon appears on your home screen.

### Android (Chrome)
1. Open your Vercel URL in **Chrome**.
2. Tap the **three dots** menu (top right).
3. Tap **Add to Home screen** → **Add**.
4. The app installs like a native app.

---

## Step 5 — Play online with a friend

1. One person opens the app and taps **Spel aanmaken**.
2. A 6-character room code appears (e.g. `AB12CD`).
3. Share that code with your friend via WhatsApp, SMS, etc.
4. Your friend opens the app, taps **Spel joinen**, and enters the code.
5. The game starts automatically — each player rolls to decide who goes first!

---

## Troubleshooting

**Multiplayer not connecting?**
- Double-check your `firebaseConfig` values in `multiplayer.js` — a typo in `databaseURL` is the most common cause.
- Make sure your Firebase Realtime Database rules are published.

**App not installing?**
- Must be served over HTTPS (Vercel does this automatically).
- On iPhone, must use Safari (not Chrome) to install.

**Want a custom domain?** (e.g. trictrac.nl)
- Buy a domain at Namecheap or Porkbun (~€10/year).
- In Vercel → your project → **Settings → Domains** → add your domain.
- Follow Vercel's DNS instructions (takes ~10 minutes).

---

## What Claude already did for you ✓
- [x] Full TricTrac game engine (all Dutch rules)
- [x] Starting roll — highest die goes first
- [x] 2-player local mode
- [x] AI opponent (easy / medium / hard)
- [x] Online multiplayer with room codes
- [x] PWA manifest + service worker (installable)
- [x] App icons (192px + 512px)
- [x] Firebase security rules
- [x] Mobile-optimised layout

## What you need to do ✓
- [ ] Step 1: Upload files to GitHub
- [ ] Step 2: Create Firebase project and paste config
- [ ] Step 3: Deploy on Vercel
- [ ] Step 4: Install on your phone
- [ ] Step 5: Share with friends and play!
