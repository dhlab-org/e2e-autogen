import { createServer } from "node:http";
import { Server as IoServer } from "socket.io";
import { MockSocketServer } from "./mock-socket-server";
import { RecordingSource } from "./recording-source";
import { SocketScenarioBuilder } from "./scenario-builder";
import { SocketIoPlayer } from "./socketio-player";

const makeMockSocketServer = ({
  data,
  port,
  speed,
}: TArgs): MockSocketServer => {
  const http = createServer();
  const io = new IoServer(http, {
    serveClient: false,
    transports: ["websocket", "polling"],
  });

  const source = new RecordingSource({ data });
  const builder = new SocketScenarioBuilder({ defaultSpeed: 1 });
  const player = new SocketIoPlayer({ httpServer: http, io, port });

  return new MockSocketServer({
    source,
    builder,
    player,
    buildOptions: { speed: speed ?? 1 },
  });
};

export { makeMockSocketServer };

type TArgs = {
  data: unknown;
  port: number;
  speed?: number;
};
