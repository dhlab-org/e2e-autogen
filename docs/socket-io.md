# Socket.io 목 서버 가이드 (experimental)

녹화된 socket.io 트래픽(JSON)을 재생하는 목 서버를 제공하여, E2E 테스트에서 서버 응답을 안정적으로 재현할 수 있습니다.

## 예시
```ts
import { makeMockSocketServer } from "@dhlab/e2e-autogen/socketio";
import recordingData from './recording.json';

const server = makeMockSocketServer({
  data: recordingData,
  port: 64436,
  speed: 1,
});

await server.start();
console.log("ready:", server.connected());
```
