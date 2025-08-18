import type { Server as THttpServer } from "node:http";
import type {
  Namespace,
  Server as TIoServer,
  Socket as TServerSocket,
} from "socket.io";
import {
  TJSON_EQ,
  type TOnConnectBurst,
  type TSocketScenario,
  type TTriggeredStep,
} from "./types";

type SocketPlayerContract = {
  start(s: TSocketScenario): Promise<void>;
  close(): void;
  connected(): boolean;
};

class SocketIoPlayer implements SocketPlayerContract {
  readonly #http: THttpServer;
  readonly #io: TIoServer;
  readonly #port: number;

  #ns?: Namespace;
  #socket?: TServerSocket;
  #timers: NodeJS.Timeout[] = [];
  #step = 0;

  constructor({ httpServer, io, port }: TArgs) {
    this.#http = httpServer;
    this.#io = io;
    this.#port = port;
    if (!this.#http || !this.#io || !this.#port)
      throw new Error("invalid args");
  }

  async start(s: TSocketScenario): Promise<void> {
    await new Promise<void>((resolve) => {
      this.#http.listen(this.#port, () => resolve());
    });

    const nsPath = s.namespace || "/";
    this.#ns = nsPath === "/" ? this.#io.of("/") : this.#io.of(nsPath);

    // handshake reject 처리
    this.#ns.use((_, next) => {
      const rej = s.handshakeReject;
      if (!rej) {
        next();
        return;
      }

      if (rej.afterMs && rej.afterMs > 0) {
        const t = setTimeout(() => {
          const error = new Error(rej.message) as any;
          error.data = { message: rej.message, code: rej.code };
          next(error);
        }, rej.afterMs);
        this.#timers.push(t);
        return;
      }

      const error = new Error(rej.message) as any;
      error.data = { message: rej.message, code: rej.code };
      next(error);
    });

    this.#ns.on("connection", (socket) => {
      this.#socket = socket;
      this.#step = 0;

      // onConnect
      this.#burst(socket, s.onConnect);

      // 단계별 트리거
      if (s.steps.length > 0) this.#bind(socket, s.steps);

      if (s.disconnectAfterMs != null) {
        const t = setTimeout(
          () => socket.disconnect(true),
          s.disconnectAfterMs
        );
        this.#timers.push(t);
      }

      socket.on("disconnect", () => {
        this.#socket = undefined;
        this.#clear();
      });
    });
  }

  close(): void {
    this.#clear();
    this.#io?.close();
    this.#http?.close();
  }

  connected(): boolean {
    return this.#socket?.connected ?? false;
  }

  // ---- private ----
  #bind(socket: TServerSocket, steps: TTriggeredStep[]) {
    const handler =
      (eventName: string) =>
      (...args: unknown[]) => {
        const step = steps[this.#step];
        if (!step) return;
        const ok =
          step.expect.event === eventName && TJSON_EQ(step.expect.args, args);
        if (!ok) return;
        this.#emitWithDelay(socket, step.responses);
        this.#step += 1;
      };
    const events = Array.from(new Set(steps.map((s) => s.expect.event)));
    events.forEach((ev) => socket.on(ev, handler(ev)));
  }

  #burst(socket: TServerSocket, burst: TOnConnectBurst) {
    if (burst.responses.length === 0) return;
    this.#emitWithDelay(socket, burst.responses);
  }

  #emitWithDelay(
    socket: TServerSocket,
    rs: { event: string; args: unknown[]; delayMs: number }[]
  ) {
    rs.forEach((r) => {
      const t = setTimeout(() => socket.emit(r.event, ...r.args), r.delayMs);
      this.#timers.push(t);
    });
  }

  #clear() {
    this.#timers.forEach(clearTimeout);
    this.#timers = [];
  }
}

export { SocketIoPlayer, type SocketPlayerContract };

type TArgs = {
  httpServer: THttpServer;
  io: TIoServer;
  port: number;
};
