/**
 * High-Fidelity Planetary Texture & Spherical Raycasting Engine
 * Generates photorealistic equirectangular planetary maps (Earth, Mars, Jupiter, Venus, etc.)
 * with authentic geography, oceans, continents, deserts, city lights, and clouds,
 * and renders true 3D spherical projection under arbitrary camera yaw/pitch.
 */

export interface PlanetaryTextureSet {
  surface: HTMLCanvasElement;
  nightLights?: HTMLCanvasElement;
  clouds?: HTMLCanvasElement;
}

// Cached texture canvases
let earthTextures: PlanetaryTextureSet | null = null;
let jupiterTexture: HTMLCanvasElement | null = null;
let marsTexture: HTMLCanvasElement | null = null;
let moonTexture: HTMLCanvasElement | null = null;
let venusTexture: HTMLCanvasElement | null = null;

/**
 * Creates high-detail Equirectangular Earth map (1024x512)
 * Latitude: -90° (bottom) to +90° (top)
 * Longitude: -180° (left) to +180° (right)
 */
export function getEarthTextures(): PlanetaryTextureSet {
  if (earthTextures) return earthTextures;

  const W = 1024;
  const H = 512;

  // 1. Day Surface (Oceans, Continents, Deserts, Ice Caps)
  const surface = document.createElement('canvas');
  surface.width = W;
  surface.height = H;
  const sCtx = surface.getContext('2d')!;

  // Deep ocean background
  const oceanGrad = sCtx.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0, '#0c4a6e'); // Polar cold ocean
  oceanGrad.addColorStop(0.5, '#0369a1'); // Tropical azure ocean
  oceanGrad.addColorStop(1, '#0c4a6e');
  sCtx.fillStyle = oceanGrad;
  sCtx.fillRect(0, 0, W, H);

  // Shallow coastal waters / continental shelves (Turquoise shallows)
  sCtx.fillStyle = '#0284c7';
  drawEarthContinents(sCtx, W, H, 14, '#0284c7');

  // Continents: Green vegetation baseline
  drawEarthContinents(sCtx, W, H, 0, '#15803d');

  // Arid Deserts (Sahara, Arabian Peninsula, Gobi, Australian Outback)
  drawEarthDeserts(sCtx, W, H);

  // Mountain ranges (Himalayas, Andes, Rockies)
  drawEarthMountains(sCtx, W, H);

  // Polar Ice Sheets (Greenland & Antarctica)
  sCtx.fillStyle = '#f8fafc';
  // Antarctica (entire bottom from lat -70 to -90)
  sCtx.beginPath();
  sCtx.rect(0, H * 0.86, W, H * 0.14);
  sCtx.fill();
  // Greenland
  sCtx.beginPath();
  sCtx.ellipse(W * 0.42, H * 0.14, W * 0.05, H * 0.07, -0.2, 0, Math.PI * 2);
  sCtx.fill();
  // Arctic sea ice
  sCtx.beginPath();
  sCtx.rect(0, 0, W, H * 0.07);
  sCtx.fill();

  // 2. Night-side City Lights (Golden glowing civilization dots)
  const nightLights = document.createElement('canvas');
  nightLights.width = W;
  nightLights.height = H;
  const nCtx = nightLights.getContext('2d')!;
  nCtx.fillStyle = '#000000';
  nCtx.fillRect(0, 0, W, H);
  drawEarthCityLights(nCtx, W, H);

  // 3. Cloud Deck (Swirling cyclones, ITCZ belt)
  const clouds = document.createElement('canvas');
  clouds.width = W;
  clouds.height = H;
  const cCtx = clouds.getContext('2d')!;
  cCtx.clearRect(0, 0, W, H);
  drawEarthClouds(cCtx, W, H);

  earthTextures = { surface, nightLights, clouds };
  return earthTextures;
}

/**
 * Draws accurate world continent boundaries in equirectangular projection
 */
function drawEarthContinents(ctx: CanvasRenderingContext2D, W: number, H: number, padding: number, color: string) {
  ctx.fillStyle = color;

  // Helper to place continent blobs
  const blob = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx * W, cy * H, (rx * W) + padding, (ry * H) + padding, rot, 0, Math.PI * 2);
    ctx.fill();
  };

  // --- NORTH AMERICA ---
  blob(0.22, 0.28, 0.09, 0.09, -0.2); // Canada / Alaska
  blob(0.24, 0.38, 0.07, 0.08, 0.1);  // United States
  blob(0.21, 0.47, 0.04, 0.05, 0.4);  // Mexico / Central America
  blob(0.28, 0.44, 0.02, 0.03, -0.3); // Florida

  // --- SOUTH AMERICA ---
  blob(0.33, 0.60, 0.06, 0.09, 0.3);  // Brazil / Amazon
  blob(0.31, 0.73, 0.04, 0.09, 0.1);  // Argentina / Chile Andes

  // --- EUROPE & SCANDINAVIA ---
  blob(0.50, 0.28, 0.04, 0.05, 0.2);  // Western Europe
  blob(0.54, 0.22, 0.03, 0.07, 0.3);  // Scandinavia
  blob(0.47, 0.27, 0.02, 0.03, 0.5);  // UK & Ireland
  blob(0.48, 0.35, 0.03, 0.03, 0.0);  // Iberia (Spain)
  blob(0.53, 0.34, 0.015, 0.04, 0.4); // Italy

  // --- AFRICA ---
  blob(0.53, 0.46, 0.08, 0.07, 0.1);  // Sahara / North Africa
  blob(0.55, 0.62, 0.06, 0.09, -0.1); // Central & Southern Africa
  blob(0.64, 0.66, 0.015, 0.04, 0.4); // Madagascar

  // --- ASIA ---
  blob(0.68, 0.25, 0.13, 0.10, 0.0);  // Siberia / Russia
  blob(0.72, 0.38, 0.09, 0.08, 0.1);  // China / East Asia
  blob(0.66, 0.46, 0.04, 0.06, -0.2); // India
  blob(0.59, 0.42, 0.04, 0.05, 0.3);  // Middle East / Arabia
  blob(0.81, 0.35, 0.015, 0.06, 0.5); // Japan
  blob(0.76, 0.54, 0.05, 0.05, 0.4);  // Southeast Asia / Indonesia

  // --- AUSTRALIA & OCEANIA ---
  blob(0.84, 0.70, 0.07, 0.06, 0.0);  // Australia
  blob(0.92, 0.77, 0.015, 0.05, 0.6); // New Zealand
}

/**
 * Draws Sahara, Arabian, Gobi, and Outback arid deserts
 */
function drawEarthDeserts(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#b45309'; // Desert ochre/sand
  const desertBlob = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx * W, cy * H, rx * W, ry * H, rot, 0, Math.PI * 2);
    ctx.fill();
  };

  desertBlob(0.52, 0.44, 0.07, 0.04, 0.1); // Sahara
  desertBlob(0.59, 0.42, 0.035, 0.03, 0.3); // Arabian Peninsula
  desertBlob(0.69, 0.34, 0.05, 0.03, 0.0); // Gobi Desert
  desertBlob(0.83, 0.70, 0.045, 0.035, 0.0); // Great Sandy / Victoria Desert (Australia)
  desertBlob(0.20, 0.40, 0.025, 0.03, 0.2); // Southwestern US Desert
}

/**
 * Draws mountain ridges (Himalayas, Andes, Rockies)
 */
function drawEarthMountains(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = '#78716c'; // Mountain stone grey
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Himalayas
  ctx.moveTo(W * 0.65, H * 0.38);
  ctx.lineTo(W * 0.72, H * 0.39);
  // Andes
  ctx.moveTo(W * 0.29, H * 0.53);
  ctx.lineTo(W * 0.32, H * 0.78);
  // Rockies
  ctx.moveTo(W * 0.18, H * 0.24);
  ctx.lineTo(W * 0.22, H * 0.42);
  ctx.stroke();
}

/**
 * Draws night-side city lights
 */
function drawEarthCityLights(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#fef08a';
  const city = (cx: number, cy: number, density: number, spread: number) => {
    for (let i = 0; i < density; i++) {
      const px = (cx + (Math.random() - 0.5) * spread) * W;
      const py = (cy + (Math.random() - 0.5) * spread * 0.5) * H;
      const sz = Math.random() * 1.5 + 0.5;
      ctx.globalAlpha = Math.random() * 0.7 + 0.3;
      ctx.fillRect(px, py, sz, sz);
    }
  };

  // Major global metropolitan clusters
  city(0.25, 0.38, 120, 0.07); // US East Coast & Midwest
  city(0.18, 0.39, 45, 0.04);  // US West Coast
  city(0.50, 0.29, 160, 0.06); // Europe (London, Paris, Ruhr)
  city(0.54, 0.42, 40, 0.02);  // Nile Delta & Cairo
  city(0.67, 0.44, 110, 0.06); // India (Delhi, Mumbai)
  city(0.76, 0.37, 140, 0.07); // East China & Shanghai
  city(0.81, 0.35, 60, 0.03);  // Tokyo & Japan
  city(0.35, 0.64, 45, 0.04);  // Sao Paulo / Rio
  city(0.85, 0.72, 35, 0.04);  // Sydney / Melbourne
  ctx.globalAlpha = 1.0;
}

/**
 * Draws photorealistic cloud deck
 */
function drawEarthClouds(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';

  // Equatorial Intertropical Convergence Zone (ITCZ)
  for (let x = 0; x < W; x += 18) {
    const y = H * 0.5 + Math.sin(x * 0.025) * 14 + (Math.random() - 0.5) * 8;
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid-latitude cyclonic spirals
  const cyclone = (cx: number, cy: number, r: number) => {
    for (let a = 0; a < Math.PI * 4; a += 0.3) {
      const cr = (a / (Math.PI * 4)) * r;
      const px = cx * W + Math.cos(a) * cr;
      const py = cy * H + Math.sin(a) * (cr * 0.6);
      ctx.beginPath();
      ctx.arc(px, py, Math.random() * 8 + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  cyclone(0.38, 0.24, 45); // North Atlantic Storm
  cyclone(0.86, 0.26, 50); // North Pacific Storm
  cyclone(0.25, 0.68, 48); // South Pacific Storm
  cyclone(0.62, 0.72, 40); // Southern Ocean Storm
}

/**
 * Photorealistic 3D Sphere Renderer for Earth & Planets with full Yaw/Pitch 360° rotation!
 * Maps the equirectangular texture onto a 3D sphere raycast.
 */
export function renderPhotorealisticEarth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  yaw: number,
  pitch: number,
  time: number,
  lightDir: { x: number; y: number; z: number }
) {
  const textures = getEarthTextures();
  const W_tex = textures.surface.width;
  const H_tex = textures.surface.height;

  // Render on offscreen buffer matching diameter to achieve pixel-perfect 3D spherical mapping
  const diam = Math.ceil(radius * 2);
  const sphereCanvas = document.createElement('canvas');
  sphereCanvas.width = diam;
  sphereCanvas.height = diam;
  const sCtx = sphereCanvas.getContext('2d')!;

  const imgData = sCtx.createImageData(diam, diam);
  const data = new Uint32Array(imgData.data.buffer);

  // Get raw pixel buffers from textures
  const sCtxSurface = textures.surface.getContext('2d')!;
  const surfData = new Uint32Array(sCtxSurface.getImageData(0, 0, W_tex, H_tex).data.buffer);

  const nCtxNight = textures.nightLights!.getContext('2d')!;
  const nightData = new Uint32Array(nCtxNight.getImageData(0, 0, W_tex, H_tex).data.buffer);

  const cCtxClouds = textures.clouds!.getContext('2d')!;
  const cloudData = new Uint32Array(cCtxClouds.getImageData(0, 0, W_tex, H_tex).data.buffer);

  // Rotation angles
  // Planet diurnal spin adds to yaw
  const spinAngle = (yaw + time * 0.12);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(spinAngle);
  const sinY = Math.sin(spinAngle);

  // Cloud spin (clouds drift slightly faster than crust)
  const cloudSpin = (spinAngle + time * 0.04);
  const cosCY = Math.cos(cloudSpin);
  const sinCY = Math.sin(cloudSpin);

  const rSq = radius * radius;
  const invR = 1 / radius;

  for (let py = 0; py < diam; py++) {
    const dy = py - radius;
    const dySq = dy * dy;
    const rowOffset = py * diam;

    for (let px = 0; px < diam; px++) {
      const dx = px - radius;
      const dSq = dx * dx + dySq;

      if (dSq > rSq) {
        data[rowOffset + px] = 0; // Transparent outside sphere
        continue;
      }

      // Normal on sphere in screen space (nx, ny, nz)
      const nx = dx * invR;
      const ny = -dy * invR; // +Y is up
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

      // 1. Rotate normal by pitch (around X-axis)
      const npy = ny * cosP - nz * sinP;
      const npz = ny * sinP + nz * cosP;
      const npx = nx;

      // 2. Rotate by yaw / diurnal spin (around Y-axis)
      const bx = npx * cosY + npz * sinY;
      const by = npy;
      const bz = -npx * sinY + npz * cosY;

      // 3. Spherical coordinates -> Equirectangular UV
      const lat = Math.asin(Math.max(-1, Math.min(1, by))); // -PI/2 to PI/2
      const lon = Math.atan2(bx, bz); // -PI to PI

      const u = (lon + Math.PI) / (Math.PI * 2);
      const v = (Math.PI * 0.5 - lat) / Math.PI;

      const tx = Math.floor(u * W_tex) % W_tex;
      const ty = Math.max(0, Math.min(H_tex - 1, Math.floor(v * H_tex)));
      const texIdx = ty * W_tex + (tx < 0 ? tx + W_tex : tx);

      // Sample day surface pixel
      const dayPixel = surfData[texIdx];
      const dr = dayPixel & 0xff;
      const dg = (dayPixel >> 8) & 0xff;
      const db = (dayPixel >> 16) & 0xff;

      // Sample clouds at slightly offset rotation
      const c_bx = npx * cosCY + npz * sinCY;
      const c_lon = Math.atan2(c_bx, -npx * sinCY + npz * cosCY);
      const cu = (c_lon + Math.PI) / (Math.PI * 2);
      const ctx = Math.floor(cu * W_tex) % W_tex;
      const cTexIdx = ty * W_tex + (ctx < 0 ? ctx + W_tex : ctx);
      const cPixel = cloudData[cTexIdx];
      const cAlpha = (cPixel >> 24) & 0xff;

      // Lighting dot product: dot(Normal, Light)
      // Light in camera coordinates
      const NdotL = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
      const sunIllum = Math.max(0, Math.min(1, NdotL * 1.25 + 0.1));

      // Day surface color blended with clouds
      let finalR = dr;
      let finalG = dg;
      let finalB = db;

      if (cAlpha > 10) {
        const cFrac = (cAlpha / 255) * 0.85;
        finalR = finalR * (1 - cFrac) + 250 * cFrac;
        finalG = finalG * (1 - cFrac) + 252 * cFrac;
        finalB = finalB * (1 - cFrac) + 255 * cFrac;
      }

      // Specular ocean sun reflection (Phong)
      const isOcean = db > dr + 15;
      if (isOcean && sunIllum > 0.1) {
        // Half vector with camera (0, 0, 1)
        const Hx = lightDir.x;
        const Hy = lightDir.y;
        const Hz = lightDir.z + 1.0;
        const hLen = Math.hypot(Hx, Hy, Hz) || 1;
        const spec = Math.pow(Math.max(0, (nx * Hx + ny * Hy + nz * Hz) / hLen), 32);
        finalR = Math.min(255, finalR + spec * 220);
        finalG = Math.min(255, finalG + spec * 235);
        finalB = Math.min(255, finalB + spec * 255);
      }

      // Apply day illumination
      let outR = finalR * sunIllum;
      let outG = finalG * sunIllum;
      let outB = finalB * sunIllum;

      // Night side: add City Lights in darkness
      if (sunIllum < 0.25) {
        const nightFrac = Math.pow(1 - sunIllum / 0.25, 1.8);
        const nightPixel = nightData[texIdx];
        const nr = nightPixel & 0xff;
        const ng = (nightPixel >> 8) & 0xff;
        const nb = (nightPixel >> 16) & 0xff;
        outR += nr * nightFrac * 1.4;
        outG += ng * nightFrac * 1.2;
        outB += nb * nightFrac * 0.6;
      }

      // Atmospheric limb Rayleigh scattering tint on horizon
      const rim = 1 - nz;
      if (rim > 0.6) {
        const rimFac = Math.pow((rim - 0.6) / 0.4, 2) * 0.45;
        outR = outR * (1 - rimFac) + 56 * rimFac;
        outG = outG * (1 - rimFac) + 189 * rimFac;
        outB = outB * (1 - rimFac) + 248 * rimFac;
      }

      // Pack 32-bit ABGR
      data[rowOffset + px] =
        (255 << 24) |
        (Math.min(255, Math.floor(outB)) << 16) |
        (Math.min(255, Math.floor(outG)) << 8) |
        Math.min(255, Math.floor(outR));
    }
  }

  sCtx.putImageData(imgData, 0, 0);

  // Draw rendered 3D sphere onto main canvas
  ctx.drawImage(sphereCanvas, cx - radius, cy - radius);
}
