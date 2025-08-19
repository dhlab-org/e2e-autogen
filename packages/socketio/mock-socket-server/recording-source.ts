import type { TSocketIoRecording } from "./types";

type RecordingSourceContract = {
  load(): Promise<TSocketIoRecording>;
};

class RecordingSource implements RecordingSourceContract {
  readonly #data: unknown;

  constructor(args: TArgs) {
    this.#data = args.data;
    if (!this.#data) throw new Error("data is required");
  }

  async load(): Promise<TSocketIoRecording> {
    // 배열인 경우 socketio 타입의 첫 번째 객체 찾기
    if (Array.isArray(this.#data)) {
      const socketioRecording = this.#data.find(
        (item) => item?.type === "socketio"
      );
      if (!socketioRecording || !Array.isArray(socketioRecording?.messages)) {
        throw new Error("No valid socketio recording found in array");
      }
      return socketioRecording as TSocketIoRecording;
    }

    // 단일 객체
    const data = this.#data as Record<string, unknown>;
    if (data?.type !== "socketio" || !Array.isArray(data?.messages)) {
      throw new Error("Invalid socketio recording data");
    }
    return data as TSocketIoRecording;
  }
}

export { RecordingSource, type RecordingSourceContract };

type TArgs = { data: unknown };
