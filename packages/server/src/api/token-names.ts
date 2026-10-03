/**
 * A DELEGATED TOKEN NAMES ITS OWN ROW: the contract's `mft_<id>_<secret>` (`mintToken`'s
 * `secret`), the id without dashes on the platform and with them in the mock's fixture. The id a
 * page hands beside a secret must be the one the secret names, or a member's word could claim
 * another token as ours: a watch's id noted as ours lists an outside token under *Our agents*
 * (m122's watch half), and a conversation's marks it a conversation's (m83). Read from the secret
 * alone, never from the platform: nothing is asked.
 */
const NAMED = /^mft_([0-9a-fA-F-]{32,36})_/

const bare = (id: string) => id.replaceAll('-', '').toLowerCase()

export function secretNames(token: string, tokenId: string): boolean {
  const named = NAMED.exec(token)?.[1]
  return named !== undefined && bare(named) === bare(tokenId)
}
