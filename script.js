// Array of castle images
const images = [
  'castle1.png.png',
  'castle2.png.png',
  'castle3.png.png',
  'castle4.png.png',
  'castle5.png.png',
  'castle6.png.png',
  'castle7.png.png',
  'castle8.png.png',
  'castle9.png.png',
  'castle10.png.png',
  'castle11.png.png',
  'castle12.png.png',
  'castle13.png.png',
  'castle14.png.png'
];

// Randomize image function
document.getElementById('randomize-button').addEventListener('click', () => {
  const randomIndex = Math.floor(Math.random() * images.length);
  document.getElementById('canvas-image').src = images[randomIndex];
});

// Display a random castle on page load
window.onload = () => {
  const randomIndex = Math.floor(Math.random() * images.length);
  document.getElementById('canvas-image').src = images[randomIndex];
};
