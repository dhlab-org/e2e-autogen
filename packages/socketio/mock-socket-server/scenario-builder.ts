import {
  TEMPTY_BURST,
  type TOnConnectBurst,
  type TSocketIoRecording,
  type TSocketScenario,
  type TTriggeredStep,
} from "./types";

type ScenarioBuilderContract = {
  build(rec: TSocketIoRecording, opts?: { speed?: number }): TSocketScenario;
};

class SocketScenarioBuilder implements ScenarioBuilderContract {
  readonly #defaultSpeed: number;

  constructor({ defaultSpeed }: TArgs = {}) {
    this.#defaultSpeed = defaultSpeed && defaultSpeed > 0 ? defaultSpeed : 1;
  }

  build(rec: TSocketIoRecording, opts?: { speed?: number }): TSocketScenario {
    const speed =
      opts?.speed && opts.speed > 0 ? opts.speed : this.#defaultSpeed;
    const ns = rec.connection.namespace ?? "/";
    const startTs = rec.connection.timestamp;
    const sorted = [...rec.messages].sort((a, b) => a.timestamp - b.timestamp);

    // 1) 연결 직후 선제 응답
    const firstCts = sorted.findIndex((m) => m.direction === "clientToServer");
    const onConnectMsgs = (
      firstCts === -1 ? sorted : sorted.slice(0, firstCts)
    ).filter((m) => m.direction === "serverToClient");

    const onConnect: TOnConnectBurst =
      onConnectMsgs.length === 0
        ? TEMPTY_BURST
        : {
            responses: onConnectMsgs.map((m) => ({
              event: m.event,
              args: m.data,
              delayMs: Math.max(0, Math.round((m.timestamp - startTs) / speed)),
            })),
          };

    // 2) CTS 트리거 구간 묶기
    const steps: TTriggeredStep[] = [];
    const ctsIdxs = sorted
      .map((m, i) => ({ m, i }))
      .filter((x) => x.m.direction === "clientToServer")
      .map((x) => x.i);

    for (let k = 0; k < ctsIdxs.length; k++) {
      const i = ctsIdxs[k];
      const j = ctsIdxs[k + 1] ?? sorted.length;
      const trigger = sorted[i];
      const responses = sorted
        .slice(i + 1, j)
        .filter((m) => m.direction === "serverToClient")
        .map((m) => ({
          event: m.event,
          args: m.data,
          delayMs: Math.max(
            0,
            Math.round((m.timestamp - trigger.timestamp) / speed)
          ),
        }));
      steps.push({
        expect: { event: trigger.event, args: trigger.data },
        responses,
      });
    }

    // 3) 종료/핸드셰이크
    const disconnectAfterMs =
      rec.closedAt && rec.closedAt > startTs
        ? Math.max(0, Math.round((rec.closedAt - startTs) / speed))
        : undefined;

    return {
      namespace: ns,
      onConnect,
      steps,
      disconnectAfterMs,
      handshakeReject: rec.connection.reject,
    };
  }
}

export { SocketScenarioBuilder, type ScenarioBuilderContract };

type TArgs = { defaultSpeed?: number };
