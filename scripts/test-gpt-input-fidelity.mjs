import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Exercise the real request builder without credentials or paid API calls.
const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({
  root,
  configFile: false,
  resolve: { alias: { '@': `${root}src` } },
  server: { middlewareMode: true },
  appType: 'custom',
})
const originalFetch = globalThis.fetch
const reference = 'data:image/png;base64,aGVsbG8='
let count = 0
try {
  const { generateCharacterImage } = await server.ssrLoadModule('/src/services/aiGenerator.ts')
  for (const endpointMode of ['images_edits_json', 'images_edits', 'responses']) {
    for (const model of [
      'gpt-image-2', 'gpt-image-2-2026-04-21',
      'gpt-image-2.5', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-sunburst-2026-09-08',
      'gpt-image-2.5-flare', 'gpt-image-2.5-flare-2026-09-08', 'gpt-image-1.5',
    ]) {
      for (const inputFidelity of ['high', 'low']) {
        let captured
        globalThis.fetch = async (url, init) => {
          captured = { url, init }
          return Response.json({ data: [{ b64_json: 'test-output' }] })
        }
        const result = await generateCharacterImage({
          recipe: { extraImages: [{ url: reference }] },
          prompt: 'Preserve the reference outfit.',
          config: {
            activeProvider: 'gpt',
            providers: { gpt: {
              baseUrl: 'https://api.openai.com/v1', apiKey: 'test-only',
              model: 'custom', customModel: ` ${model} `,
            } },
            imagePassMode: 'url', sendStitchedSheet: false, useProxy: false,
            gptParams: {
              endpointMode, inputFidelity, size: 'auto', quality: 'high',
              background: 'auto', outputFormat: 'png', moderation: 'auto',
            },
          },
        })
        assert.equal(captured.url, `https://api.openai.com/v1/${endpointMode === 'responses' ? 'responses' : 'images/edits'}`)
        const body = captured.init.body instanceof FormData
          ? Object.fromEntries(captured.init.body)
          : JSON.parse(captured.init.body)
        const params = endpointMode === 'responses' ? body.tools[0] : body
        if (model === 'gpt-image-1.5') {
          assert.equal(params.input_fidelity, inputFidelity)
        } else {
          assert.equal(Object.hasOwn(params, 'input_fidelity'), false, `${endpointMode}: ${model} must omit input_fidelity`)
        }
        assert.equal(params.quality, 'high')
        assert.equal(params.output_format, 'png')
        assert.equal(body.model, model)
        assert.equal(result.imageUrl, 'data:image/png;base64,test-output')
        count++
      }
    }
  }
  console.log(`PASS: ${count} request cases (JSON, multipart, Responses; GPT Image 2/2.5 including Flare, Sunburst and snapshots; 1.5; high/low)`)
} finally {
  globalThis.fetch = originalFetch
  await server.close()
}
