import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as contract from '@manifest/contract'
import { describe, expect, it } from 'vitest'

/**
 * DECISION 5: THE CONTRACT FROM SOURCE, in both runtimes our server has. Its package.json
 * sends a runtime to its git-ignored dist/, which another session rebuilds when it likes,
 * and a missing alias or `paths` fails NOTHING: everything runs against that build instead
 * (F1 sitting 1, M1 and M5).
 */
const SOURCE = new URL(
  '../../../../manifest/packages/contract/src/index.ts',
  import.meta.url,
)
const PACKAGE = fileURLToPath(new URL('..', import.meta.url))
const TSX = fileURLToPath(new URL('../../../node_modules/.bin/tsx', import.meta.url))

describe('@manifest/contract is the contract’s src/index.ts, never its dist/', () => {
  it('in Vitest (the alias in vitest.config.ts)', async () => {
    const fromSource = (await import(/* @vite-ignore */ SOURCE.href)) as typeof contract
    expect(contract.createManifestClient).toBe(fromSource.createManifestClient)
  })

  it('under tsx, which runs our server (the `paths` in tsconfig.base.json)', () => {
    const resolved = execFileSync(
      TSX,
      [
        '--input-type=module',
        '-e',
        "console.log(import.meta.resolve('@manifest/contract'))",
      ],
      { cwd: PACKAGE, encoding: 'utf8' },
    ).trim()
    expect(resolved).toBe(SOURCE.href)
  })
})
