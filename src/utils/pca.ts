/**
 * Stable dimensionality reduction for embeddings
 * Uses a simplified t-SNE-like approach with controlled forces
 */

const MAX_COORD = 15; // Maximum coordinate value
const MIN_DIST = 0.1; // Minimum distance to prevent division issues

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] || 0;
    const bi = b[i] || 0;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(-1, Math.min(1, similarity)); // Clamp to [-1, 1]
}

/**
 * Clamp a value to a range
 */
function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(min, Math.min(max, val));
}

/**
 * Seeded random for deterministic layout
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

/**
 * Project high-dimensional embeddings to 3D
 * Uses a stable force-directed layout approach
 */
export function projectTo3D(embeddings: number[][]): number[][] {
  const n = embeddings.length;
  
  if (n === 0) return [];
  if (n === 1) return [[0, 0, 0]];
  if (n === 2) return [[-5, 0, 0], [5, 0, 0]];

  // Create deterministic seed from embedding characteristics
  const seed = embeddings.reduce((acc, emb) => {
    return acc + (emb[0] || 0) + (emb[1] || 0) + emb.length;
  }, 42);
  const random = seededRandom(Math.floor(seed * 1000));

  // Initialize positions in a sphere
  const positions: number[][] = [];
  for (let i = 0; i < n; i++) {
    const theta = random() * 2 * Math.PI;
    const phi = Math.acos(2 * random() - 1);
    const r = 3 + random() * 7;
    positions.push([
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ]);
  }

  // Compute similarity matrix (cache it)
  const similarities: number[][] = [];
  for (let i = 0; i < n; i++) {
    similarities[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        similarities[i][j] = 1;
      } else {
        similarities[i][j] = cosineSimilarity(embeddings[i], embeddings[j]);
      }
    }
  }

  // Force-directed layout with careful clamping
  const iterations = 150;
  const baseAttraction = 0.02;
  const baseRepulsion = 0.8;
  
  for (let iter = 0; iter < iterations; iter++) {
    // Decay factors over iterations
    const decay = 1 - iter / iterations;
    const attractionStrength = baseAttraction * decay;
    const repulsionStrength = baseRepulsion * decay;
    
    const forces: number[][] = Array(n).fill(0).map(() => [0, 0, 0]);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j][0] - positions[i][0];
        const dy = positions[j][1] - positions[i][1];
        const dz = positions[j][2] - positions[i][2];
        
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) || MIN_DIST;
        
        const sim = similarities[i][j];
        
        // Attractive force proportional to similarity
        // Similar nodes should be closer
        const idealDist = (1 - sim) * 20 + 2; // Range: 2 to 22
        const attraction = (dist - idealDist) * attractionStrength;
        
        // Repulsive force to prevent overlap
        const repulsion = -repulsionStrength / (distSq + 1);
        
        const totalForce = attraction + repulsion;
        
        // Normalized direction
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        
        // Apply forces symmetrically
        const fx = nx * totalForce;
        const fy = ny * totalForce;
        const fz = nz * totalForce;
        
        forces[i][0] += fx;
        forces[i][1] += fy;
        forces[i][2] += fz;
        forces[j][0] -= fx;
        forces[j][1] -= fy;
        forces[j][2] -= fz;
      }
    }

    // Apply forces with clamping
    for (let i = 0; i < n; i++) {
      // Clamp force magnitude to prevent explosions
      const fx = clamp(forces[i][0], -2, 2);
      const fy = clamp(forces[i][1], -2, 2);
      const fz = clamp(forces[i][2], -2, 2);
      
      positions[i][0] = clamp(positions[i][0] + fx, -MAX_COORD, MAX_COORD);
      positions[i][1] = clamp(positions[i][1] + fy, -MAX_COORD, MAX_COORD);
      positions[i][2] = clamp(positions[i][2] + fz, -MAX_COORD, MAX_COORD);
    }
  }

  // Center the layout
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    cx += positions[i][0];
    cy += positions[i][1];
    cz += positions[i][2];
  }
  cx /= n;
  cy /= n;
  cz /= n;

  // Apply centering and final validation
  for (let i = 0; i < n; i++) {
    positions[i][0] = clamp(positions[i][0] - cx, -MAX_COORD, MAX_COORD);
    positions[i][1] = clamp(positions[i][1] - cy, -MAX_COORD, MAX_COORD);
    positions[i][2] = clamp(positions[i][2] - cz, -MAX_COORD, MAX_COORD);
  }

  return positions;
}

