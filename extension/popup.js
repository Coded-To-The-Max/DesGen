let currentImage = null;
let processedEdges = null;
let equations = [];

// Remove OpenCV dependency - using pure JS implementation
console.log('DesGen popup loaded - using pure JS edge detection');

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const threshold1Input = document.getElementById('threshold1');
const threshold2Input = document.getElementById('threshold2');
const maxCurvesInput = document.getElementById('maxCurves');
const aiEnhancedCheckbox = document.getElementById('aiEnhanced');
const previewCanvas = document.getElementById('previewCanvas');
const previewCard = document.getElementById('previewCard');
const injectBtn = document.getElementById('injectBtn');
const statusDiv = document.getElementById('status');
const curveCountDiv = document.getElementById('curveCount');
const equationCountDiv = document.getElementById('equationCount');

// Update range value displays
threshold1Input.addEventListener('input', (e) => {
  document.getElementById('threshold1Value').textContent = e.target.value;
  if (currentImage) processImage();
});

threshold2Input.addEventListener('input', (e) => {
  document.getElementById('threshold2Value').textContent = e.target.value;
  if (currentImage) processImage();
});

maxCurvesInput.addEventListener('input', (e) => {
  document.getElementById('maxCurvesValue').textContent = e.target.value;
  if (currentImage) processImage();
});

aiEnhancedCheckbox.addEventListener('change', () => {
  if (currentImage) processImage();
});

// Upload zone interactions
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleImageUpload(file);
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImageUpload(file);
  }
});

// Handle image upload
function handleImageUpload(file) {
  if (file.size > 5 * 1024 * 1024) {
    showStatus('File too large. Max 5MB.', 'error');
    return;
  }

  showStatus('Loading image...', '');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      showStatus('Image loaded successfully!', 'success');
      processImage();
    };
    img.onerror = () => {
      showStatus('Failed to load image', 'error');
      currentImage = null;
      injectBtn.disabled = true;
    };
    img.src = e.target.result;
  };
  reader.onerror = () => {
    showStatus('Failed to read file', 'error');
  };
  reader.readAsDataURL(file);
}

// Pure JS edge detection implementation
function processImage() {
  if (!currentImage) {
    showStatus('No image loaded', 'error');
    return;
  }

  try {
    showStatus('Processing image...', '');

    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    const maxWidth = 500;
    const scale = Math.min(1, maxWidth / currentImage.width);
    canvas.width = currentImage.width * scale;
    canvas.height = currentImage.height * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

    // Get image data
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Apply enhanced preprocessing if enabled
    if (aiEnhancedCheckbox.checked) {
      imageData = enhanceImage(imageData);
    }
    
    // Apply edge detection
    const edges = detectEdges(imageData, parseInt(threshold1Input.value), parseInt(threshold2Input.value));
    
    // Display edges on preview canvas
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.putImageData(edges, 0, 0);

    // Extract contours
    const contours = findContours(edges);
    
    // Convert contours to equations
    equations = contoursToEquations(contours, canvas.width, canvas.height);

    // Update stats
    curveCountDiv.textContent = contours.length;
    equationCountDiv.textContent = equations.length;

    // Show preview and enable inject button
    previewCard.classList.remove('hidden');
    injectBtn.disabled = false;
    showStatus(`Detected ${equations.length} equations`, 'success');

  } catch (error) {
    console.error('Processing error:', error);
    showStatus('Error processing image: ' + error.message, 'error');
    injectBtn.disabled = true;
  }
}

// Enhanced image preprocessing
function enhanceImage(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Step 1: Convert to grayscale with contrast enhancement
  const gray = new Uint8ClampedArray(width * height);
  let min = 255, max = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const val = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[idx] = val;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  
  // Step 2: Histogram equalization for contrast enhancement
  const range = max - min;
  if (range > 0) {
    for (let i = 0; i < gray.length; i++) {
      gray[i] = ((gray[i] - min) / range) * 255;
    }
  }
  
  // Step 3: Apply stronger Gaussian blur (5x5 kernel)
  const blurred = strongGaussianBlur(gray, width, height);
  
  // Step 4: Morphological closing to connect nearby edges
  const closed = morphologicalClose(blurred, width, height);
  
  // Convert back to ImageData
  const enhanced = new ImageData(width, height);
  for (let i = 0; i < closed.length; i++) {
    enhanced.data[i * 4] = closed[i];
    enhanced.data[i * 4 + 1] = closed[i];
    enhanced.data[i * 4 + 2] = closed[i];
    enhanced.data[i * 4 + 3] = 255;
  }
  
  return enhanced;
}

// Stronger 5x5 Gaussian blur
function strongGaussianBlur(data, width, height) {
  const kernel = [
    1, 4, 7, 4, 1,
    4, 16, 26, 16, 4,
    7, 26, 41, 26, 7,
    4, 16, 26, 16, 4,
    1, 4, 7, 4, 1
  ];
  const kernelSum = 273;
  const result = new Uint8ClampedArray(data.length);
  
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let sum = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kidx = (ky + 2) * 5 + (kx + 2);
          sum += data[idx] * kernel[kidx];
        }
      }
      result[y * width + x] = sum / kernelSum;
    }
  }
  
  return result;
}

// Morphological closing (dilation followed by erosion)
function morphologicalClose(data, width, height) {
  const dilated = dilate(data, width, height);
  const closed = erode(dilated, width, height);
  return closed;
}

function dilate(data, width, height) {
  const result = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let maxVal = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          if (data[idx] > maxVal) maxVal = data[idx];
        }
      }
      result[y * width + x] = maxVal;
    }
  }
  
  return result;
}

function erode(data, width, height) {
  const result = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let minVal = 255;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          if (data[idx] < minVal) minVal = data[idx];
        }
      }
      result[y * width + x] = minVal;
    }
  }
  
  return result;
}

// Sobel edge detection
function detectEdges(imageData, lowThreshold, highThreshold) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Convert to grayscale
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  // Gaussian blur
  const blurred = gaussianBlur(gray, width, height);
  
  // Sobel operator
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  const gradient = new Float32Array(width * height);
  const maxGradient = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kidx = (ky + 1) * 3 + (kx + 1);
          gx += blurred[idx] * sobelX[kidx];
          gy += blurred[idx] * sobelY[kidx];
        }
      }
      
      const idx = y * width + x;
      gradient[idx] = Math.sqrt(gx * gx + gy * gy);
      maxGradient[idx] = gradient[idx];
    }
  }
  
  // Non-maximum suppression and thresholding
  const edges = new ImageData(width, height);
  for (let i = 0; i < gradient.length; i++) {
    const val = gradient[i] > highThreshold ? 255 : (gradient[i] > lowThreshold ? 128 : 0);
    edges.data[i * 4] = val;
    edges.data[i * 4 + 1] = val;
    edges.data[i * 4 + 2] = val;
    edges.data[i * 4 + 3] = 255;
  }
  
  return edges;
}

function gaussianBlur(data, width, height) {
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;
  const result = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kidx = (ky + 1) * 3 + (kx + 1);
          sum += data[idx] * kernel[kidx];
        }
      }
      result[y * width + x] = sum / kernelSum;
    }
  }
  
  return result;
}

function findContours(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const visited = new Uint8Array(width * height);
  const contours = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (data[idx * 4] > 128 && !visited[idx]) {
        const contour = traceContour(data, visited, width, height, x, y);
        if (contour.length > 10) {
          contours.push(contour);
        }
      }
    }
  }
  
  return contours;
}

function traceContour(data, visited, width, height, startX, startY) {
  const contour = [];
  const stack = [[startX, startY]];
  
  while (stack.length > 0 && contour.length < 1000) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || data[idx * 4] < 128) {
      continue;
    }
    
    visited[idx] = 1;
    contour.push({ x, y });
    
    // 8-connected neighbors
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx !== 0 || dy !== 0) {
          stack.push([x + dx, y + dy]);
        }
      }
    }
  }
  
  return contour;
}

// Convert contours to Desmos equations
function contoursToEquations(contours, width, height) {
  const maxCurves = parseInt(maxCurvesInput.value);
  const equations = [];
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = 10 / Math.max(width, height);

  // Sort contours by length
  contours.sort((a, b) => b.length - a.length);

  // Process top contours
  const numToProcess = Math.min(maxCurves, contours.length);
  
  for (let i = 0; i < numToProcess; i++) {
    const contour = contours[i];
    const points = [];

    // Transform to Desmos coordinate system
    for (const point of contour) {
      const desmosX = (point.x - centerX) * scale;
      const desmosY = (centerY - point.y) * scale;
      points.push({ x: desmosX, y: desmosY });
    }

    // Simplify points
    const simplified = simplifyPoints(points, 0.1);

    // Create parametric equations
    if (simplified.length >= 3) {
      const eq = createParametricEquation(simplified, i);
      if (eq) equations.push(eq);
    }
  }

  return equations;
}

// Simplify points using Douglas-Peucker algorithm
function simplifyPoints(points, tolerance) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [first, last];
  }
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  if (norm === 0) return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
  
  const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (norm * norm);
  const projX = lineStart.x + u * dx;
  const projY = lineStart.y + u * dy;
  
  return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
}

function createParametricEquation(points, index) {
  if (points.length < 2) return null;

  // Store full points array for injection
  return {
    id: `curve_${index}`,
    points: points,
    color: '#2464b4'
  };
}

// Generate equations and display them
injectBtn.addEventListener('click', () => {
  if (equations.length === 0) {
    showStatus('No equations to generate', 'error');
    return;
  }

  try {
    // Format equations for Desmos as connected lines using polygon
    const equationLines = [];
    
    equations.forEach((eq, i) => {
      const points = eq.points;
      
      // Aggressively limit points to prevent Desmos overload
      const maxPointsPerCurve = 200;
      const sampledPoints = [];
      const step = Math.max(1, Math.floor(points.length / maxPointsPerCurve));
      
      for (let j = 0; j < points.length; j += step) {
        sampledPoints.push(points[j]);
      }
      
      const xList = sampledPoints.map(p => p.x.toFixed(2)).join(',');
      const yList = sampledPoints.map(p => p.y.toFixed(2)).join(',');

      // Create list variables for x and y coordinates
      equationLines.push(`L_{${i}}=[${xList}]`);
      equationLines.push(`M_{${i}}=[${yList}]`);
      // Use polygon function with styling hint in comment
      equationLines.push(`\\operatorname{polygon}(L_{${i}},M_{${i}})`);
      equationLines.push(''); // Empty line for readability
    });

    // Display equations
    const equationsOutput = document.getElementById('equationsOutput');
    const equationsCard = document.getElementById('equationsCard');
    
    equationsOutput.value = equationLines.join('\n');
    equationsCard.classList.remove('hidden');
    
    showStatus(`Generated ${equations.length} curves!`, 'success');

  } catch (error) {
    console.error('Generation error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
});

// Copy equations to clipboard
document.getElementById('copyBtn').addEventListener('click', async () => {
  const equationsOutput = document.getElementById('equationsOutput');
  try {
    await navigator.clipboard.writeText(equationsOutput.value);
    showStatus('Equations copied to clipboard!', 'success');
  } catch (error) {
    // Fallback for older browsers
    equationsOutput.select();
    document.execCommand('copy');
    showStatus('Equations copied to clipboard!', 'success');
  }
});

// Open Desmos calculator
document.getElementById('openDesmosBtn').addEventListener('click', () => {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url: 'https://www.desmos.com/calculator' });
  } else {
    window.open('https://www.desmos.com/calculator', '_blank');
  }
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status';
  if (type) statusDiv.classList.add(type);
  statusDiv.classList.remove('hidden');
  
  if (type === 'success') {
    setTimeout(() => statusDiv.classList.add('hidden'), 3000);
  }
}
