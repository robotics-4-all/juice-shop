import io from 'socket.io-client'

export let socket: SocketIOClient.Socket

export function setupSocket (done: () => void) {
  socket = io('http://localhost:3000', {
    reconnectionDelay: 0,
    forceNew: true
  })
  socket.on('connect', () => {
    done()
  })
}

export function teardownSocket (done: () => void) {
  if (socket.connected) {
    socket.disconnect()
  }
  done()
};
