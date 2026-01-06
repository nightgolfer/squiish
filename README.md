# Squiish! v.0.1.2

![Squiish logo](src/shared/prerendered-app/Intro/imgs/logo-with-text.svg)

**[Squiish](https://github.com/nightgolfer/squiish)** is an image compression web app that reduces image sizes through numerous formats **in bulk**, and with a few extra features added.

It is based on [squoosh-multiple-export](https://github.com/Khongchai/squoosh-multiple-export) by [Khongchai](https://github.com/Khongchai), which is forked from [Squoosh](https://github.com/GoogleChromeLabs/squoosh) by [Google Chrome Labs](https://github.com/GoogleChromeLabs).

# Features

In addition to the original Squoosh features, Squiish has been modified with the following functionality:

- Bulk processing from [squoosh-multiple-export](https://github.com/Khongchai/squoosh-multiple-export), but added graceful fallback for situations where files would fail to download because the app ran out of memory.
- Added the ability to set the bulk batch size to mitigate errors caused by app running out of memory (Edit > Bulk processing > Batch size). Default is 3 (app will process and download 3 images at a time, before starting on the next batch of 3).
- Added the ability to proportionally resize all uploaded images based on their longest edge (**Edit > Resize > Resize to > Long edge**); change the 'Long edge:' value to whatever length in pixels you want each image's longest edge to have (short edge will be scaled to match). 'Long edge' is the default 'Resize to' method.
- Added the ability to rename all downloaded files (Edit > Filename > Rename). Files will have sequential numbering prepended, with leading underscore and zeroes (where relevant), e.g.: _new-filename_1.jpg_ for batches ≤ 9, _new-filename_01.jpg_ for batches ≤ 99, etc. Default value is blank (no renaming).
- Added the ability to prepend text to the filename (Edit > Filename > Prepend), to make processed files easily identifiable. Default value is '\_sqsh', e.g.: _new-filename_01_sqsh.jpg_. Edit > Filename is toggled on by default.

# Notes

- I'm only running Squiish locally, for personal use. I have no idea how it will fare in an online environment; YMMV + use at own peril!
- Only tested with JPG output and ~10 JPG file batches. Everything probably works, but I don't know for certain.
- Completely vibe-coded with Codex/ChatGPT 5.2; less than ideal code is to be expected.

# To-do / ideas

Some thoughts on future modifications, but do keep in mind that this project is being 'developed' in <span title="Don't Hold Your Breath">**DHYB**</span>-mode, so they may never happen ...

- Add 'Resize to: Short edge' option in **Edit > Resize > Resize to**
- Swap 'Download all X files' button and regular download button functionality (change the former to 'Download current file' and add more arrows to the latter).
- Add better progress indicators ('Processing X', check off processed files on a list, spinning wheel, make interface inactive, percentage done indicator, etc.).

# Privacy

Squiish does not send your image to a server. All image compression processes locally.

The original version had Google telemetry included; this has been stripped out of Squiish.

# Running locally (serve)

1. Clone the repository.
2. To install node packages, from the install root dir run:
   ```sh
   npm install
   ```
3. Then build the app by running:
   ```sh
   npm run build
   ```
4. After building, start the app by running:
   ```sh
   npx serve -s build -l 3060
   ```
5. (optional) To install as a PWA app, open app in chrome (default http://localhost/3060); there should be a buttom in the top right corner that says 'Install'. Keep in mind that the app still needs to be running for the PWA app to work.

# Running locally (Electron)

1. Clone the repository.
2. To install node packages, from the install root dir run:
   ```sh
   npm install
   ```
3. Then build the app by running:
   ```sh
   npm run build
   ```
4. Launch the Electron wrapper:
   ```sh
   npm run electron
   ```

Downloads are saved to your system Downloads folder, and drag/drop from Finder
is supported by the browser-based file drop UI.

# Packaging Electron (standalone)

To package a standalone Electron app (macOS by default):

1. Install dependencies:
   ```sh
   npm install
   ```
2. Build the app:
   ```sh
   npm run build
   ```
3. Create a distributable:
   ```sh
   npm run electron:dist
   ```

Artifacts are written to `dist/`. These instructions assume macOS; for
Windows/Linux you generally need to build on the target OS. On macOS,
signing/notarization is optional for local use but required for clean
distribution.

# Developing (unaltered from original README.md; YMMV!)

To develop for Squoosh:

1. Clone the repository
2. To install node packages, run:
   ```sh
   npm install
   ```
3. Then build the app by running:
   ```sh
   npm run build
   ```
4. After building, start the development server by running:
   ```sh
   npm run dev
   ```

# Contributing to (original) Squoosh

Squoosh is an open-source project that appreciates all community involvement. To contribute to the project, follow the [contribute guide](/CONTRIBUTING.md).

# Links

- original Squoosh app: https://squoosh.app
- original Squoosh code: https://github.com/GoogleChromeLabs/squoosh
- squoosh-multiple-export code: https://github.com/Khongchai/squoosh-multiple-export
- squiish code: https://github.com/nightgolfer/squiish
