/* eslint-disable */
const socket = io();
const skipButton = document.getElementById('skip');

skipButton.addEventListener('click', () => {
  socket.emit('skip');
});
