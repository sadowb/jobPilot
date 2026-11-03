import { extractCvText } from './cv-extract';

/**
 * Entry of the CV reader utility process (see `cv-text.ts`). One request in, one reply out. The parent kills it on
 * timeout, so a hostile or pathological file can hang or crash only this process, never the app.
 */
const port = process.parentPort;
port.once('message', (event) => {
  const { bytes } = event.data as { bytes: Uint8Array };
  extractCvText(bytes).then(
    (text) => port.postMessage({ ok: true, text }),
    (error: unknown) =>
      port.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Unreadable file.' }),
  );
});
