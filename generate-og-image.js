const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create canvas with OG image dimensions
const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Set up dark cyber theme background
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#0a0a0a'); // Very dark gray/black
gradient.addColorStop(0.5, '#1a1a2e'); // Dark blue-purple
gradient.addColorStop(1, '#16213e'); // Darker blue

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Add some subtle cyber-style grid pattern
ctx.strokeStyle = '#00ffff15'; // Very faint cyan
ctx.lineWidth = 1;

// Vertical lines
for (let x = 0; x < width; x += 60) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
}

// Horizontal lines
for (let y = 0; y < height; y += 60) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
}

// Add some glowing accents/nodes
ctx.fillStyle = '#00ffff40'; // Semi-transparent cyan
const nodes = [
  { x: 150, y: 150, size: 4 },
  { x: 350, y: 100, size: 3 },
  { x: 800, y: 180, size: 5 },
  { x: 1000, y: 120, size: 3 },
  { x: 200, y: 450, size: 4 },
  { x: 950, y: 480, size: 6 },
  { x: 600, y: 500, size: 3 },
];

nodes.forEach(node => {
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
  ctx.fill();
  
  // Add glow effect
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;
});

// Connect some nodes with lines
ctx.strokeStyle = '#00ffff30';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(nodes[0].x, nodes[0].y);
ctx.lineTo(nodes[1].x, nodes[1].y);
ctx.lineTo(nodes[2].x, nodes[2].y);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(nodes[4].x, nodes[4].y);
ctx.lineTo(nodes[5].x, nodes[5].y);
ctx.lineTo(nodes[6].x, nodes[6].y);
ctx.stroke();

// Main title: "AgenticAiHome"
ctx.fillStyle = '#00ffff'; // Bright cyan
ctx.font = 'bold 72px Arial, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Add text shadow/glow effect
ctx.shadowColor = '#00ffff';
ctx.shadowBlur = 10;
ctx.fillText('AgenticAiHome', width / 2, height / 2 - 40);

// Reset shadow for tagline
ctx.shadowBlur = 0;

// Tagline: "The First AI Agent Marketplace on Ergo"
ctx.fillStyle = '#ffffff'; // White
ctx.font = '32px Arial, sans-serif';
ctx.fillText('The First AI Agent Marketplace on Ergo', width / 2, height / 2 + 60);

// Add a subtle border glow
ctx.strokeStyle = '#00ffff20';
ctx.lineWidth = 2;
ctx.strokeRect(10, 10, width - 20, height - 20);

// Save the image as PNG
const outputPath = path.join(__dirname, 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`✅ OG image generated successfully at: ${outputPath}`);
console.log(`📏 Dimensions: ${width}x${height} pixels`);
console.log(`💾 File size: ${(buffer.length / 1024).toFixed(1)} KB`);