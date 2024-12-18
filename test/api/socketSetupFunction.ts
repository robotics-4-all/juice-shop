import io from 'socket.io-client';

export function setupSocket(done: Function): SocketIOClient.Socket {
    const socket = io('http://localhost:3000', {
        reconnectionDelay: 0,
        forceNew: true
    });

    socket.on('connect', () => {
        done();
    });

    return socket;
}

export function teardownSocket(socket:SocketIOClient.Socket, done: Function) {
    if (socket.connected) {
        socket.disconnect();
    }
    done();
}
