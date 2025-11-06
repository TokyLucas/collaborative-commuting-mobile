import { io, Socket } from "socket.io-client";

export class PokeChannel {
  private socket: Socket;
  private userId: string;

  constructor(userId: string, onReceive: (payload: any) => void) {
    this.userId = userId;
    this.socket = io("http://localhost:9000");
    this.socket.on("poke", (payload: any) => {
      if (payload.to === this.userId) {
        onReceive(payload);
      }
    });
  }

  send(toId: string) {
    this.socket.emit("poke", { from: this.userId, to: toId });
  }
}
