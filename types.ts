export interface Memory {
  id: string;
  url: string;
  description: string;
  timestamp: number;
  // Spherical coordinates (radians)
  theta: number; // Horizontal angle (0 to 2PI)
  phi: number;   // Vertical angle (0 to PI)
  
  // Visual characteristics
  scale: number;
  rotation: number; // Local rotation of the image frame
  driftSpeed: number; // Speed of the subtle floating animation
  isAnalyzing: boolean;
}

export interface Coordinates {
  x: number;
  y: number;
}