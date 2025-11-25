/**
 * Eigenvalue decomposition utilities for 3x3 symmetric matrices
 * Used to compute proper ellipsoid orientation from covariance matrices
 */

import * as THREE from 'three';

type Matrix3x3 = [[number, number, number], [number, number, number], [number, number, number]];

/**
 * Compute eigenvalues and eigenvectors of a 3x3 symmetric matrix using Jacobi iteration
 * Returns eigenvalues sorted in descending order with corresponding eigenvectors
 */
export const computeEigendecomposition = (matrix: Matrix3x3): {
  eigenvalues: [number, number, number];
  eigenvectors: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
} => {
  const EPSILON = 1e-10;
  const MAX_ITERATIONS = 50;

  // Copy matrix to avoid mutation
  const a = matrix.map((row) => [...row]) as Matrix3x3;
  
  // Initialize eigenvectors as identity
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  // Jacobi rotation method
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const absVal = Math.abs(a[i][j]);
        if (absVal > maxVal) {
          maxVal = absVal;
          p = i;
          q = j;
        }
      }
    }

    // Check for convergence
    if (maxVal < EPSILON) break;

    // Compute rotation angle
    const theta =
      0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply rotation to matrix
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        const aip = a[i][p];
        const aiq = a[i][q];
        a[i][p] = c * aip - s * aiq;
        a[p][i] = a[i][p];
        a[i][q] = s * aip + c * aiq;
        a[q][i] = a[i][q];
      }
    }

    // Apply rotation to eigenvectors
    for (let i = 0; i < 3; i++) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = c * vip - s * viq;
      v[i][q] = s * vip + c * viq;
    }
  }

  // Extract eigenvalues (diagonal elements)
  const eigenvalues: [number, number, number] = [a[0][0], a[1][1], a[2][2]];

  // Create eigenvector objects
  const eigenvectors: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(v[0][0], v[1][0], v[2][0]).normalize(),
    new THREE.Vector3(v[0][1], v[1][1], v[2][1]).normalize(),
    new THREE.Vector3(v[0][2], v[1][2], v[2][2]).normalize(),
  ];

  // Sort by eigenvalue (descending)
  const sorted: Array<{ value: number; vector: THREE.Vector3 }> = eigenvalues.map((val, i) => ({
    value: val,
    vector: eigenvectors[i],
  }));
  sorted.sort((a, b) => b.value - a.value);

  return {
    eigenvalues: [sorted[0].value, sorted[1].value, sorted[2].value],
    eigenvectors: [sorted[0].vector, sorted[1].vector, sorted[2].vector],
  };
};

/**
 * Create rotation matrix from eigenvectors
 */
export const createRotationMatrix = (
  eigenvectors: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
): THREE.Matrix4 => {
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(eigenvectors[0], eigenvectors[1], eigenvectors[2]);
  return matrix;
};

