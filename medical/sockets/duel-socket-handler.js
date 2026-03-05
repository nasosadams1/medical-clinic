// sockets/duel-socket-handler.js
export function registerDuelSocket(io, duelEngine) {
  io.on('connection', (socket) => {

    socket.on('duel_join_room', ({ matchId }) => {
      socket.join(matchId);
    });

    socket.on('duel_submit', async ({ matchId, code }) => {
      await duelEngine.handleSubmission(matchId, socket.userId, code);
    });

  });
}