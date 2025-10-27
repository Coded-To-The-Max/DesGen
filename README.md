# DesGen Chrome Extension

Convert images to Desmos graph outlines using advanced edge detection, not a perfect trace due to detection limitations, but a discernible outline.

## Installation

### Option 1: Install from GitHub (Recommended)

1. Go to [https://github.com/Coded-To-The-Max/DesGen](https://github.com/Coded-To-The-Max/DesGen)
2. Click the green "Code" button and select "Download ZIP"
3. Extract the ZIP file to a location on your computer
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" toggle in the top right corner
6. Click "Load unpacked" button
7. Navigate to the extracted folder and select the `public` folder (which contains the `extension` subfolder and `manifest.json`)

### Option 2: Clone with Git

1. Open terminal or command prompt
2. Run: `git clone https://github.com/Coded-To-The-Max/DesGen.git`
3. Navigate to the DesGen folder: `cd DesGen`
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" toggle in the top right corner
6. Click "Load unpacked" button
7. Select the `public` folder (which contains the `extension` subfolder and `manifest.json`)

## Usage

1. Click the DesGen extension icon in your Chrome toolbar
2. Upload an image (PNG, JPG up to 5MB)
3. *WORKS BEST WITH OBJECTS WITH BLANK BACKGROUND AS EDGE DETECTION CANNOT DIFFERENTIATE BACKGROUND*
4. Adjust edge detection thresholds and max curves as needed
5. Click "Process & Inject to Desmos"
6. Open https://www.desmos.com/calculator in a new tab
7. The extension will output a list of equations to copy-paste into Desmos.
8. For best best-looking result, due to Desmos limitations, you must manually click the gear icon and click the colors, and change them to either the same color and uncheck the "Fill" option.

## Features

- Drag & drop image upload
- Real-time edge detection preview
- Adjustable Canny edge detection thresholds
- Curve limit control to prevent Desmos lag
- AI-enhanced detection (experimental)
- Automatic viewport fitting

## GitHub Repository

https://github.com/Coded-To-The-Max/DesGen

## License

GNU License
