/* eslint-disable */
const socket = io();
const skipButton = document.getElementById('skip');

skipButton.addEventListener('click', () => {
  console.log('Emitting skip');
  socket.emit('skip');
});
