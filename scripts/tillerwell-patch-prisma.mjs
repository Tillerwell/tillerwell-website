#!/usr/bin/env node
/**
 * Tillerwell (Netlify): make the generated Prisma client loadable in Netlify's
 * edge middleware. Runs after `prisma generate` (in prebuild) and before
 * `next build`.
 *
 * Netlify runs proxy.ts as Node middleware on its edge runtime, which loads
 * CommonJS from an in-memory copy of the traced files. Two things in the
 * generated client break there:
 *
 *  1. .prisma/client/default.js is `require('#main-entry-point')`, a package.json
 *     "imports" alias. Netlify's loader resolves "exports" but not "imports".
 *  2. index.js reads query_compiler_bg.wasm with fs.readFileSync. Netlify packs
 *     traced files as UTF-8 text, so a binary .wasm cannot survive the trip.
 *
 * So default.js requires index.js directly, and the compiler is decoded from
 * Prisma's own base64 copy, which is plain JS and survives as text.
 */

import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const clientDir = path.join(rootDir, 'node_modules', '.prisma', 'client')

const defaultJs = path.join(clientDir, 'default.js')
writeFileSync(
  defaultJs,
  readFileSync(defaultJs, 'utf8').replace("require('#main-entry-point')", "require('./index.js')"),
)

const indexJs = path.join(clientDir, 'index.js')
const source = readFileSync(indexJs, 'utf8')
const loader = /getQueryCompilerWasmModule: async \(\) => \{[\s\S]*?return new WebAssembly\.Module\(queryCompilerWasmFileBytes\)\s*\}/
if (!loader.test(source)) {
  console.error('[tillerwell-patch-prisma] query compiler loader not found in index.js - Prisma changed shape')
  process.exit(1)
}
writeFileSync(
  indexJs,
  source.replace(
    loader,
    `getQueryCompilerWasmModule: async () => {
        const { wasm } = require('@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.js')
        return new WebAssembly.Module(Uint8Array.from(atob(wasm), (c) => c.charCodeAt(0)))
      }`,
  ),
)

console.log('[tillerwell-patch-prisma] default.js and the query compiler loader patched')
