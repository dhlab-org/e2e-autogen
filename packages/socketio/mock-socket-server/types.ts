export type TSocketIoMessage = {
  direction: "clientToServer" | "serverToClient";
  event: string;
  data: unknown[];
  timestamp: number;
  isBinary?: boolean;
};

export type TSocketIoRecording = {
  type: "socketio";
  requestId: string;
  connection: {
    url: string;
    namespace?: string;
    timestamp: number;
    reject?: {
      message: string;
      afterMs?: number;
      code?: string | number;
      data?: unknown;
    };
  };
  messages: TSocketIoMessage[];
  closedAt?: number;
};

export type TOnConnectBurst = {
  responses: { event: string; args: unknown[]; delayMs: number }[];
};

export type TTriggeredStep = {
  expect: { event: string; args: unknown[] };
  responses: { event: string; args: unknown[]; delayMs: number }[];
};

export type TSocketScenario = {
  namespace: string; // 기본 "/"
  onConnect: TOnConnectBurst;
  steps: TTriggeredStep[];
  disconnectAfterMs?: number;
  handshakeReject?: {
    message: string;
    afterMs?: number;
    code?: string | number;
    data?: unknown;
  };
};

/** 유틸 */
export const TEMPTY_BURST: TOnConnectBurst = { responses: [] };
export const TJSON_EQ = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
