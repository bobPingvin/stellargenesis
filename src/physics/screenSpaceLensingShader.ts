/**
 * StellarGenesis - Screen-Space Gravitational Lensing Shader
 * High-performance WebGL 2D/3D screen-space post-processing shader with GLSL.
 * Implements Einstein gravitational ray deflection, chromatic dispersion,
 * secondary mirror inversion, and incandescent multi-order Photon Rings (r = 1.45 rs).
 */

import { CameraState } from '../types';

export interface BlackHoleScreenData {
  screenX: number;
  screenY: number;
  screenRs: number;          // Schwarzschild radius in screen pixels
  screenEinsteinRadius: number; // Einstein radius in screen pixels
  mass: number;
  spin: number;
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  // Flip Y for texture coordinates
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_backgroundTexture;
uniform vec2 u_resolution;
uniform float u_time;
uniform int u_numBlackHoles;

// Max 8 concurrent black holes on screen
uniform vec4 u_blackHoles[8];       // xy: screen pos, z: screen rs, w: screen rE
uniform vec4 u_blackHoleParams[8]; // x: mass, y: spin, z: reserved, w: reserved

void main() {
  vec2 pixelPos = v_uv * u_resolution;
  vec2 totalOffset = vec2(0.0);
  float totalMagnification = 1.0;
  float totalPhotonGlow = 0.0;
  float horizonShadow = 0.0;

  for (int i = 0; i < 8; i++) {
    if (i >= u_numBlackHoles) break;

    vec2 bhPos = u_blackHoles[i].xy;
    float rs   = u_blackHoles[i].z;
    float rE   = u_blackHoles[i].w;
    float mass = u_blackHoleParams[i].x;

    vec2 delta = pixelPos - bhPos;
    float dist = length(delta);
    if (dist < 0.0001) dist = 0.0001;
    vec2 dir = delta / dist;

    // --- 1. EVENT HORIZON SHADOW ---
    if (dist < rs * 0.99) {
      float shadowFactor = 1.0 - smoothstep(rs * 0.92, rs * 0.99, dist);
      horizonShadow = max(horizonShadow, shadowFactor);
    }

    // --- 2. SCREEN-SPACE RELATIVISTIC DEFLECTION ---
    if (dist > rs * 0.95) {
      float u = max(0.05, dist / max(1.0, rE));
      // Primary Einstein image deflection
      float primaryDist = ((u + sqrt(u * u + 4.0)) * 0.5) * rE;
      float dispMag = primaryDist - dist;

      // Smooth cutoff radius to avoid affecting entire screen infinitely
      float cutoff = smoothstep(rE * 4.5, rs * 1.01, dist);
      totalOffset += dir * dispMag * cutoff;

      // Gravitational magnification
      float mag = (u * u + 2.0) / (2.0 * u * sqrt(u * u + 4.0));
      totalMagnification *= mix(1.0, clamp(mag, 1.0, 3.8), cutoff);
    }

    // --- 3. RAZOR-SHARP PHOTON RING (Directly on the event horizon boundary shell) ---
    float rPhoton1 = rs * 1.018; // Razor-thin bright caustic hugging the shadow rim
    float rPhoton2 = rs * 1.045; // Sub-shell caustic
    
    float diff1 = abs(dist - rPhoton1);
    float diff2 = abs(dist - rPhoton2);

    float sigma1 = max(0.85, rs * 0.016);
    float sigma2 = max(0.55, rs * 0.010);

    float ring1 = exp(-0.5 * (diff1 * diff1) / (sigma1 * sigma1)) * 3.8;
    float ring2 = exp(-0.5 * (diff2 * diff2) / (sigma2 * sigma2)) * 1.8;

    // Subtle relativistic azimuthal swirl
    float angle = atan(delta.y, delta.x);
    float swirl = 0.90 + 0.10 * sin(angle * 6.0 - u_time * 2.8);

    totalPhotonGlow += (ring1 + ring2) * swirl;
  }

  // --- 4. GRAVITATIONAL CHROMATIC DISPERSION SAMPLING ---
  vec2 uvDisp = totalOffset / u_resolution;

  vec2 uvR = clamp(v_uv + uvDisp * 1.018, vec2(0.001), vec2(0.999));
  vec2 uvG = clamp(v_uv + uvDisp * 1.000, vec2(0.001), vec2(0.999));
  vec2 uvB = clamp(v_uv + uvDisp * 0.982, vec2(0.001), vec2(0.999));

  vec4 colR = texture2D(u_backgroundTexture, uvR);
  vec4 colG = texture2D(u_backgroundTexture, uvG);
  vec4 colB = texture2D(u_backgroundTexture, uvB);

  vec3 baseColor = vec3(colR.r, colG.g, colB.b) * totalMagnification;

  // --- 5. COMPOSITE PHOTON RING EMISSION ---
  vec3 photonRingColor = vec3(1.0, 0.95, 0.75) * (totalPhotonGlow * 1.6)
                       + vec3(0.98, 0.65, 0.18) * pow(totalPhotonGlow, 1.3) * 0.9
                       + vec3(0.58, 0.82, 1.00) * (totalPhotonGlow * 0.4);

  vec3 finalColor = baseColor + photonRingColor;

  // Apply absolute pitch-black event horizon singularity
  finalColor = mix(finalColor, vec3(0.0, 0.0, 0.0), horizonShadow);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export class GravitationalLensingShader {
  private glCanvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;

  // Uniform locations
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uNumBlackHolesLoc: WebGLUniformLocation | null = null;
  private uBlackHolesLoc: WebGLUniformLocation | null = null;
  private uBlackHoleParamsLoc: WebGLUniformLocation | null = null;
  private uBgTextureLoc: WebGLUniformLocation | null = null;

  private isInitialized = false;
  private fallbackCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.initWebGL();
  }

  private initWebGL() {
    try {
      this.glCanvas = document.createElement('canvas');
      this.gl = this.glCanvas.getContext('webgl', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false
      });

      if (!this.gl) {
        console.warn('WebGL not available for Gravitational Lensing Shader, using 2D fallback');
        return;
      }

      const gl = this.gl;

      // Compile Shaders
      const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

      if (!vertShader || !fragShader) {
        return;
      }

      const program = gl.createProgram();
      if (!program) return;

      gl.attachShader(program, vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Shader program link failed:', gl.getProgramInfoLog(program));
        return;
      }

      this.program = program;

      // Setup Fullscreen Quad
      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]);

      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const aPositionLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

      // Create Texture
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Retrieve Uniform Locations
      this.uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
      this.uTimeLoc = gl.getUniformLocation(program, 'u_time');
      this.uNumBlackHolesLoc = gl.getUniformLocation(program, 'u_numBlackHoles');
      this.uBlackHolesLoc = gl.getUniformLocation(program, 'u_blackHoles');
      this.uBlackHoleParamsLoc = gl.getUniformLocation(program, 'u_blackHoleParams');
      this.uBgTextureLoc = gl.getUniformLocation(program, 'u_backgroundTexture');

      this.isInitialized = true;
    } catch (err) {
      console.warn('Error initializing WebGL Gravitational Lensing Shader:', err);
      this.isInitialized = false;
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Resizes internal WebGL buffer canvas
   */
  public resize(width: number, height: number) {
    if (this.glCanvas) {
      this.glCanvas.width = width;
      this.glCanvas.height = height;
    }
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  /**
   * Executes the Screen-Space Gravitational Lensing Shader Pass
   * @param targetCtx Main canvas 2D rendering context
   * @param sourceCanvas Offscreen canvas containing pristine background cosmos
   * @param blackHoles Array of active black holes in screen coordinates
   * @param timestamp Simulation animation timestamp
   */
  public renderLensing(
    targetCtx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    blackHoles: BlackHoleScreenData[],
    timestamp: number
  ): boolean {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    if (!this.isInitialized || !this.gl || !this.glCanvas || !this.program || blackHoles.length === 0) {
      return false; // Fallback to standard 2D compositing
    }

    const gl = this.gl;

    if (this.glCanvas.width !== width || this.glCanvas.height !== height) {
      this.resize(width, height);
    }

    gl.useProgram(this.program);

    // Upload background source texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    // Set Uniforms
    gl.uniform2f(this.uResolutionLoc, width, height);
    gl.uniform1f(this.uTimeLoc, timestamp * 0.001);
    gl.uniform1i(this.uBgTextureLoc, 0);

    const bhCount = Math.min(8, blackHoles.length);
    gl.uniform1i(this.uNumBlackHolesLoc, bhCount);

    const bhData = new Float32Array(8 * 4);
    const bhParams = new Float32Array(8 * 4);

    for (let i = 0; i < bhCount; i++) {
      const bh = blackHoles[i];
      bhData[i * 4 + 0] = bh.screenX;
      bhData[i * 4 + 1] = bh.screenY;
      bhData[i * 4 + 2] = bh.screenRs;
      bhData[i * 4 + 3] = bh.screenEinsteinRadius;

      bhParams[i * 4 + 0] = bh.mass;
      bhParams[i * 4 + 1] = bh.spin;
      bhParams[i * 4 + 2] = 1.0;
      bhParams[i * 4 + 3] = 0.0;
    }

    gl.uniform4fv(this.uBlackHolesLoc, bhData);
    gl.uniform4fv(this.uBlackHoleParamsLoc, bhParams);

    // Draw Full-Screen Quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Draw result onto target context
    targetCtx.drawImage(this.glCanvas, 0, 0, width, height);
    return true;
  }

  public dispose() {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
    if (this.gl && this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.gl && this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }
    this.gl = null;
    this.glCanvas = null;
    this.isInitialized = false;
  }
}
