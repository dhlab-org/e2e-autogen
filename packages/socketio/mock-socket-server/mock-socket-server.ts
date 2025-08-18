import type { RecordingSourceContract } from "./recording-source-file";
import type { ScenarioBuilderContract } from "./scenario-builder";
import type { SocketPlayerContract } from "./socketio-player";

type SocketServerContract = {
  start(): Promise<void>;
  close(): void;
  connected(): boolean;
};

class MockSocketServer implements SocketServerContract {
  readonly #source: RecordingSourceContract;
  readonly #builder: ScenarioBuilderContract;
  readonly #player: SocketPlayerContract;
  readonly #opts?: { speed?: number };

  constructor({ source, builder, player, buildOptions }: TArgs) {
    this.#source = source;
    this.#builder = builder;
    this.#player = player;
    this.#opts = buildOptions;
  }

  async start(): Promise<void> {
    const rec = await this.#source.load();
    const s = this.#builder.build(rec, this.#opts);

    await this.#player.start(s);
  }

  close(): void {
    this.#player.close();
  }

  connected(): boolean {
    return this.#player.connected();
  }
}

export { MockSocketServer };

type TArgs = {
  source: RecordingSourceContract;
  builder: ScenarioBuilderContract;
  player: SocketPlayerContract;
  buildOptions?: { speed?: number };
};
