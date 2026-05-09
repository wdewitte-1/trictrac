# TricTrac PWA — Setup Guide

Complete guide to get your TricTrac app live, installable on phones, and playable online.

---

## What you need
- Free GitHub account → https://github.com
- Free Firebase account → https://firebase.google.com
- Free Vercel account → https://vercel.com
- ~30 minutes

---

## Step 1 — Upload files to GitHub

1. Go to https://github.com → sign in → click **+** → **New repository**
2. Name it `trictrac` → set to **Public** → **Create repository**
3. Click **uploading an existing file**
4. Drag ALL files from the `trictrac` folder into the upload area
5. Click **Commit changes**

---

## Step 2 — Set up Firebase (multiplayer)

1. Go to https://console.firebase.google.com → **Add project** → name it `trictrac`
2. Click **Realtime Database** → **Create Database** → choose region → **Start in test mode**
3. Click **Rules** tab → paste the contents of `firebase-rules.json` → **Publish**
4. Click ⚙️ gear → **Project settings** → scroll to **Your apps** → click **</>** (web icon)
5. Register app as `trictrac-web` → copy the `firebaseConfig` object shown
6. Open `js/multiplayer.js` in GitHub (click file → ✏️ pencil icon)
7. Replace the placeholder `firebaseConfig` block at the top with your values
8. Click **Commit changes**

---

## Step 3 — Deploy on Vercel (free hosting)

1. Go to https://vercel.com → sign in with GitHub
2. Click **Add New → Project** → import your `trictrac` repo
3. Leave all settings default → click **Deploy**
4. In ~30 seconds you get a live URL: `https://trictrac-yourname.vercel.app`

---

## Step 4 — Install on your phone (landscape mode)

### iPhone / iPad (Safari)
1. Open your Vercel URL in **Safari** — rotate to **landscape**
2. Tap **Share** → **Add to Home Screen** → **Add**

### Android (Chrome)
1. Open your URL in **Chrome** — rotate to **landscape**
2. Tap **⋮** → **Add to Home screen** → **Add**

The app is designed for **landscape orientation**. On portrait, it shows a friendly "please rotate" message.

---

## Step 5 — Play online

1. One player opens the app → taps **Aanmaken** → shares the 6-character code
2. Other player taps **Joinen** → enters the code
3. Both players tap **Gooi!** to roll for who starts
4. Game begins — moves sync in real time!

---

## What's in this build

- ✅ Full TricTrac rules (all Dutch rules)
- ✅ Landscape layout (forced)
- ✅ Premium dark wood board design (Lord of the Board inspired)
- ✅ Animated canvas dice — white for Player 1, red for Player 2
- ✅ Starting roll — highest die decides who goes first
- ✅ 6-slide interactive tutorial (accessible from lobby)
- ✅ 2-player local mode
- ✅ AI opponent (easy / medium / hard)
- ✅ Online multiplayer with room codes (Firebase)
- ✅ Sidebar player panels with score, phase, bar & borne-off tracking
- ✅ PWA — installs like native app (manifest + service worker)
- ✅ App icons (192px + 512px)
- ✅ Firebase security rules included

---

## Troubleshooting

**Multiplayer not connecting?**
Check your `firebaseConfig` in `multiplayer.js` — especially `databaseURL`.

**App not installing?**
Must be served over HTTPS (Vercel handles this automatically).

**Game shows "rotate screen"?**
Rotate your device to landscape mode.
