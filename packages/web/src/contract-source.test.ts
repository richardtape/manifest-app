import * as contract from '@manifest/contract'
import { expect, it } from 'vitest'

/**
 * DECISION 5: THE CONTRACT FROM SOURCE. Its package.json sends a runtime to its git-ignored
 * dist/, which another session rebuilds when it likes, and a missing alias fails NOTHING:
 * every test passes against that build instead (F1 sitting 1, M1). So this test says where
 * `@manifest/contract` came from: it must be the very module `src/index.ts` is.
 */
const SOURCE = new URL(
  '../../../../manifest/packages/contract/src/index.ts',
  import.meta.url,
)

it('@manifest/contract is the contract’s src/index.ts, never its dist/', async () => {
  const fromSource = (await import(/* @vite-ignore */ SOURCE.href)) as typeof contract
  expect(contract.createManifestClient).toBe(fromSource.createManifestClient)
})
