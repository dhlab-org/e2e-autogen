import { readFile } from "node:fs/promises";
import type { TSocketIoRecording } from "./types";

type RecordingSourceContract = {
  load(): Promise<TSocketIoRecording>;
};

class FileRecordingSource implements RecordingSourceContract {
  readonly #path: string;

  constructor(args: TArgs) {
    this.#path = args.path;
    if (!this.#path) throw new Error("path is required");
  }

  async load(): Promise<TSocketIoRecording> {
    const raw = await readFile(this.#path, "utf-8");
    const json = JSON.parse(raw);
    if (json?.type !== "socketio" || !Array.isArray(json?.messages)) {
      throw new Error("Invalid socketio recording file");
    }
    return json as TSocketIoRecording;
  }
}

export { FileRecordingSource, type RecordingSourceContract };

type TArgs = { path: string };
