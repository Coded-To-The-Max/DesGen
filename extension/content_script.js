// Content script for Desmos calculator page
console.log('DesGen content script loaded');

// Inject a script into the page context to access Desmos API
function injectPageScript() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      console.log('DesGen: Injected script running');
      
      // Wait for Desmos to be available
      let checkCount = 0;
      const maxChecks = 60; // 30 seconds
      
      const interval = setInterval(() => {
        checkCount++;
        console.log('DesGen: Check', checkCount, '- Looking for calculator...');
        
        // Try multiple methods to find the calculator
        const calcElement = document.querySelector('.dcg-calculator-api-container');
        
        if (calcElement) {
          console.log('DesGen: Found calculator element', calcElement);
          
          // Try to get calculator from element
          if (calcElement.calculator) {
            window.Calc = calcElement.calculator;
            console.log('DesGen: Calculator instance found and exposed to window.Calc');
            clearInterval(interval);
            window.postMessage({ type: 'DESGEN_CALC_READY' }, '*');
            return;
          }
        }
        
        // Also check if Desmos API is available
        if (window.Desmos && window.Desmos.GraphingCalculator) {
          console.log('DesGen: Desmos API found');
        }
        
        if (checkCount >= maxChecks) {
          console.error('DesGen: Timeout - could not find calculator after', maxChecks, 'attempts');
          clearInterval(interval);
        }
      }, 500);
    })();
  `;
  
  // Append to document element to ensure it runs in page context
  const target = document.head || document.documentElement;
  target.appendChild(script);
  script.remove();
  console.log('DesGen: Page script injected');
}

// Wait a moment for the page to be ready, then inject
setTimeout(() => {
  injectPageScript();
}, 1000);

let calculator = null;

// Listen for calculator ready message from page context
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'DESGEN_CALC_READY') {
    console.log('DesGen: Received calculator ready signal');
    calculator = true; // Mark as ready
    
    // Check for pending equations in storage
    chrome.storage.local.get(['pendingEquations', 'timestamp'], (result) => {
      console.log('DesGen: Checking storage for pending equations', result);
      
      if (result.pendingEquations && result.timestamp) {
        // Only inject if timestamp is recent (within 15 seconds)
        const age = Date.now() - result.timestamp;
        console.log('DesGen: Equation age:', age, 'ms');
        
        if (age < 15000) {
          console.log('DesGen: Found pending equations, injecting...');
          injectEquationsToPage(result.pendingEquations);
          // Clear the storage
          chrome.storage.local.remove(['pendingEquations', 'timestamp']);
        } else {
          console.log('DesGen: Equations too old, skipping');
        }
      } else {
        console.log('DesGen: No pending equations found');
      }
    });
  }
});

function injectEquationsToPage(equations) {
  console.log('DesGen: Attempting to inject', equations.length, 'equations');
  
  // Inject via page context
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      try {
        const equations = ${JSON.stringify(equations)};
        
        if (!window.Calc) {
          console.error('DesGen: window.Calc not available');
          return;
        }
        
        console.log('DesGen: Injecting equations via window.Calc');
        window.Calc.setExpressions(equations);
        console.log('DesGen: Successfully injected', equations.length, 'expressions');
        
        // Zoom to fit after a delay
        setTimeout(() => {
          try {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            equations.forEach(eq => {
              if (eq.latex && eq.latex.includes('[')) {
                const xMatch = eq.latex.match(/\\[([-\\d.,\\s]+)\\]/);
                if (xMatch) {
                  const values = xMatch[1].split(',').map(v => parseFloat(v.trim()));
                  values.forEach(v => {
                    if (!isNaN(v)) {
                      if (eq.id.startsWith('x_')) {
                        minX = Math.min(minX, v);
                        maxX = Math.max(maxX, v);
                      } else if (eq.id.startsWith('y_')) {
                        minY = Math.min(minY, v);
                        maxY = Math.max(maxY, v);
                      }
                    }
                  });
                }
              }
            });

            if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
              const padding = 1.2;
              const rangeX = (maxX - minX) * padding;
              const rangeY = (maxY - minY) * padding;
              const centerX = (minX + maxX) / 2;
              const centerY = (minY + maxY) / 2;

              window.Calc.setMathBounds({
                left: centerX - rangeX / 2,
                right: centerX + rangeX / 2,
                bottom: centerY - rangeY / 2,
                top: centerY + rangeY / 2
              });
              console.log('DesGen: Viewport adjusted to fit graph');
            }
          } catch (e) {
            console.error('DesGen: Error setting bounds:', e);
          }
        }, 500);
      } catch (error) {
        console.error('DesGen: Error in injection script:', error);
      }
    })();
  `;
  
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'injectEquations') {
    // Try to get calculator one more time if not found
    if (!calculator && window.Calc) {
      calculator = window.Calc;
      console.log('DesGen: Calculator found on injection attempt');
    }
    
    if (!calculator) {
      console.error('DesGen: Calculator still not ready. window.Calc:', window.Calc);
      sendResponse({ 
        success: false, 
        error: 'Calculator not ready. Please wait a few seconds and try again, or refresh the Desmos page.' 
      });
      return true;
    }

    try {
      // Clear existing expressions (optional)
      // calculator.setBlank();

      // Inject equations
      const equations = request.equations;
      
      // Use setExpressions for batch injection
      calculator.setExpressions(equations);

      // Zoom to fit
      setTimeout(() => {
        try {
          // Get bounds of all points
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;

          equations.forEach(eq => {
            if (eq.latex && eq.latex.includes('[')) {
              const xMatch = eq.latex.match(/\[([-\d.,\s]+)\]/);
              if (xMatch) {
                const values = xMatch[1].split(',').map(v => parseFloat(v.trim()));
                values.forEach(v => {
                  if (!isNaN(v)) {
                    if (eq.id.startsWith('x_')) {
                      minX = Math.min(minX, v);
                      maxX = Math.max(maxX, v);
                    } else if (eq.id.startsWith('y_')) {
                      minY = Math.min(minY, v);
                      maxY = Math.max(maxY, v);
                    }
                  }
                });
              }
            }
          });

          if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
            const padding = 1.2;
            const rangeX = (maxX - minX) * padding;
            const rangeY = (maxY - minY) * padding;
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            calculator.setMathBounds({
              left: centerX - rangeX / 2,
              right: centerX + rangeX / 2,
              bottom: centerY - rangeY / 2,
              top: centerY + rangeY / 2
            });
          }
        } catch (e) {
          console.error('Error setting bounds:', e);
        }
      }, 500);

      sendResponse({ success: true, count: equations.length });
    } catch (error) {
      console.error('Error injecting equations:', error);
      sendResponse({ success: false, error: error.message });
    }

    return true; // Keep message channel open for async response
  }
});