# DesGen Chrome Extension

Convert images to Desmos graph outlines using advanced edge detection.

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
3. Adjust edge detection thresholds and max curves as needed
4. Click "Process & Inject to Desmos"
5. Open https://www.desmos.com/calculator in a new tab
6. The extension will automatically inject your graph equations

## Features

- Drag & drop image upload
- Real-time edge detection preview
- Adjustable Canny edge detection thresholds
- Curve limit control to prevent Desmos lag
- AI-enhanced detection (experimental)
- Automatic viewport fitting

## Technical Details

- Uses OpenCV.js for Canny edge detection
- Douglas-Peucker algorithm for curve simplification
- Parametric list-based equations for Desmos
- Client-side processing (no server required)

## Troubleshooting

- **"Calculator not ready"**: Make sure you're on https://www.desmos.com/calculator
- **No equations appear**: Try adjusting the threshold values
- **Too many curves**: Reduce the "Max Curves" slider
- **Extension not working**: Reload the extension in chrome://extensions/

## GitHub Repository

https://github.com/Coded-To-The-Max/DesGen

## License

MIT License - Feel free to modify and distribute

## Credits

Built with:
- OpenCV.js for computer vision
- Desmos API for graphing
- Chrome Extensions API
- Glassmorphism design principles