# MoonChess for Android

The MoonChess website packaged as a native Android app with [Capacitor](https://capacitorjs.com). The app runs the same pages, board, bots, puzzles, particles and sounds as moonchess.in, stored inside the app so it works fully offline.

- App name: **MoonChess**
- Package id: `in.moonchess.app`
- Works on Android 7.0 (API 24) and newer: phones, tablets, portrait and landscape.

## What the app adds on top of the website

- **Works offline:** all fonts and files are bundled; no internet needed after install.
- **Edge to edge:** the starfield runs behind the status and navigation bars, while buttons stay clear of notches, camera cut-outs and the gesture bar.
- **Android Back button:** closes an open dialog, leaves a lesson, returns to Home, and exits from Home.
- **Phones held sideways:** the board sizes itself to the screen height with Pip and the controls beside it; the top menu replaces the bottom tab bar.
- **Touch polish:** no grey flash on tap, no accidental text selection or zooming.
- **App icon** (with Android 13 themed-icon support) and a **launch screen** with the moon logo.

Progress (XP, stars, badges) is saved on the phone. The backup code on the Me page moves progress between the website and the app.

## Get an APK without installing anything (recommended)

GitHub builds the app for you.

1. Create a new repository on GitHub, for example `moonchess-app`.
2. Upload **everything in this folder** to it, keeping the folders as they are. Make sure the hidden `.github` folder is included; it holds the build instructions. (If your computer hides it, enable "show hidden files", or use GitHub Desktop.)
3. Open the repository's **Actions** tab. A run called **Build Android app** starts by itself (or click **Run workflow**). It takes about 5–8 minutes.
4. When it shows a green tick, open the run and download **MoonChess-debug-apk** from the **Artifacts** section. Unzip it to get `MoonChess-debug-<number>.apk`.

### Install it on a phone

1. Copy the `.apk` to the phone (or download it there).
2. Tap it. Android asks to allow installs from that app (Files, Chrome, Drive…); allow it once.
3. Tap **Install**, then open MoonChess.

The debug APK is fine for testing and sharing with friends. For Google Play you need a signed release (below).

## Publishing on Google Play

Google Play needs an `.aab` bundle signed with your own key. The workflow builds one automatically once you add your key as GitHub secrets.

1. Create a signing key once, on any computer with Java installed:

   ```
   keytool -genkeypair -v -keystore moonchess.jks -alias moonchess -keyalg RSA -keysize 2048 -validity 10000
   ```

   Choose a password and keep the `.jks` file and password safe. **If you lose them you can never update the app on Play.** Never upload the `.jks` file into the repository.

2. Turn the key into text:
   - macOS / Linux: `base64 -i moonchess.jks | tr -d '\n' > moonchess.jks.txt`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("moonchess.jks")) > moonchess.jks.txt`

3. In the GitHub repository go to **Settings → Secrets and variables → Actions → New repository secret** and add:

   | Name | Value |
   |---|---|
   | `MOONCHESS_KEYSTORE_BASE64` | the contents of `moonchess.jks.txt` |
   | `MOONCHESS_KEYSTORE_PASSWORD` | the keystore password |
   | `MOONCHESS_KEY_ALIAS` | `moonchess` |
   | `MOONCHESS_KEY_PASSWORD` | the key password (same as above unless you chose a different one) |

4. Run the workflow again. The **MoonChess-release** artifact now contains a signed `.apk` and the `.aab` to upload in the Google Play Console.

Each build's version number counts up automatically, as Play requires.

A 512×512 store icon is included as `store/play-store-icon-512.png`.

## Updating the app after changing the website

The website files live in `www/`. To bring in a newer version of the site:

```
npm install
node scripts/update-web.mjs ../moonchess
```

Replace `../moonchess` with the folder that holds your website's `index.html`. The script copies the site in and re-applies the app-only changes (offline fonts, `native.css`, `native.js`). Then commit and push: GitHub builds a new APK.

## Building on your own computer (optional)

Needs Node.js 20+ and Android Studio.

```
npm install
npx cap sync android
npx cap open android
```

Android Studio opens the project; press **Run** to install on a connected phone or emulator, or use **Build → Generate Signed App Bundle / APK** for a release.

## Project layout

| Path | What it is |
|---|---|
| `www/` | the MoonChess website, plus `css/fonts.css`, `css/native.css`, `js/native.js` and `fonts/` for the app |
| `android/` | the native Android project (icons, launch screen, theme, edge-to-edge setup) |
| `capacitor.config.json` | app name, id, colours, launch-screen and system-bar settings |
| `.github/workflows/android.yml` | the automatic GitHub build |
| `scripts/update-web.mjs` | copies a newer website into `www/` |
| `assets-src/` | source used to draw the icons and launch screens |
