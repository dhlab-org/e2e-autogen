/// <reference lib="dom" />
import path from "node:path";
import { test as base, type Page } from "@playwright/test";

type TFixtures = {
  audioFilePath?: string;
  setupRecording: () => Promise<void>;
};

const recordingTest = base.extend<TFixtures>({
  // 로컬 오디오 파일 경로 (없으면 사인파)
  audioFilePath: [undefined, { option: true }],

  setupRecording: async ({ page, audioFilePath }, use) => {
    await use(async () => {
      if (audioFilePath) {
        const fileUrl = `/_e2e-audio_/${path.basename(audioFilePath)}`;
        await mockMediaDevices(page, { fileUrl, filePath: audioFilePath });
      } else {
        await mockMediaDevices(page);
      }
    });
  },
});

export { recordingTest };

const mockMediaDevices = async (
  page: Page,
  {
    enabled = true,
    fileUrl,
    filePath,
  }: { enabled?: boolean; fileUrl?: string; filePath?: string } = {}
) => {
  // 옵션에 따라 모킹 스킵
  if (!enabled) return;

  // 마이크 권한 허용 - Chrome/Chromium인 경우만
  const browserName = page.context().browser()?.browserType().name();
  if (browserName === "chromium") {
    await page.context().grantPermissions(["microphone"]);
  }

  // 오디오 파일 라우팅 설정 (요청된 URL을 로컬 파일로 응답)
  if (fileUrl && filePath) {
    await page.route("**/_e2e-audio_/*", async (route) => {
      try {
        const requested = new URL(route.request().url());
        const requestedBase = path.basename(requested.pathname);
        const expectedBase = path.basename(fileUrl);
        if (requestedBase === expectedBase) {
          await route.fulfill({
            path: filePath,
            headers: { "content-type": "audio/wav" },
          });
          return;
        }
      } catch {}
      await route.fallback();
    });
  }

  await page.evaluate(async (url) => {
    navigator.mediaDevices.getUserMedia = async () => {
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      if (url) {
        // 외부 WAV 파일을 fetch 후 단발 재생
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(destination);
        bufferSource.start(0); // loop 기본 false -> 1회 재생
      } else {
        // 사인파 모킹 (기존 로직)
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(destination);
        oscillator.start();
      }

      return destination.stream;
    };
  }, fileUrl);
};
