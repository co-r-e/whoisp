let animationFrameId: number | null = null;
let originalFavicon: string | null = null;

/**
 * Start animating the favicon with a loading spinner
 */
export function startFaviconAnimation(): void {
  // Store the original favicon if not already stored
  if (!originalFavicon) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      originalFavicon = link.href;
    }
  }

  // Stop any existing animation
  stopFaviconAnimation();

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  let rotation = 0;

  function draw() {
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 32, 32);

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(16, 16);
    ctx.rotate(rotation);

    // Draw spinning arc
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 1.5);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3b82f6'; // Blue color
    ctx.lineCap = 'round';
    ctx.stroke();

    // Restore context state
    ctx.restore();

    // Update favicon
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
                 document.createElement('link');

    link.type = 'image/x-icon';
    link.rel = 'icon';
    link.href = canvas.toDataURL('image/png');

    if (!link.parentElement) {
      document.head.appendChild(link);
    }

    // Update rotation for next frame
    rotation += 0.1;

    // Continue animation
    animationFrameId = requestAnimationFrame(draw);
  }

  draw();
}

/**
 * Stop animating the favicon and restore the original
 */
export function stopFaviconAnimation(): void {
  // Cancel animation frame
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Restore original favicon
  if (originalFavicon) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.href = originalFavicon;
    }
  }
}

/**
 * Create a pulsing dot favicon animation
 */
export function startFaviconPulseAnimation(): void {
  // Store the original favicon if not already stored
  if (!originalFavicon) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      originalFavicon = link.href;
    }
  }

  // Stop any existing animation
  stopFaviconAnimation();

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  let scale = 0;
  let growing = true;

  function draw() {
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 32, 32);

    // Draw pulsing circle
    ctx.beginPath();
    const radius = 8 + scale * 4;
    ctx.arc(16, 16, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(59, 130, 246, ${1 - scale * 0.5})`; // Blue with varying opacity
    ctx.fill();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    // Update favicon
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
                 document.createElement('link');

    link.type = 'image/x-icon';
    link.rel = 'icon';
    link.href = canvas.toDataURL('image/png');

    if (!link.parentElement) {
      document.head.appendChild(link);
    }

    // Update scale for next frame
    if (growing) {
      scale += 0.05;
      if (scale >= 1) {
        growing = false;
      }
    } else {
      scale -= 0.05;
      if (scale <= 0) {
        growing = true;
      }
    }

    // Continue animation
    animationFrameId = requestAnimationFrame(draw);
  }

  draw();
}
