import { createServer } from "node:http";
import { Server as IoServer } from "socket.io";
import { MockSocketServer } from "./mock-socket-server";
import { FileRecordingSource } from "./recording-source-file";
import { SocketScenarioBuilder } from "./scenario-builder";
import { SocketIoPlayer } from "./socketio-player";

const makeMockSocketServer = ({
  recordingPath,
  port,
  speed,
}: TArgs): MockSocketServer => {
  const http = createServer();
  const io = new IoServer(http, {
    serveClient: false,
    transports: ["websocket", "polling"],
  });

  const source = new FileRecordingSource({ path: recordingPath });
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
  recordingPath: string;
  port: number;
  speed?: number;
};
