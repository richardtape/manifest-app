/**
 * D7 (FE-39): SOMEONE WHO MAY NOT BUILD. The platform decides, and says so in `getMe`; a call
 * refused part-way (their faculty status changed since they signed in) says so by this code,
 * from the platform or from our server. Every such refusal is heard here, and the shell reads
 * `getMe` again, so the page follows the platform's decision and never shows it as an error.
 */
export const NOT_OPEN_CODE = 'BUILDING_NOT_OPEN'

/** The shell listens for `refused`. An EventTarget of its own: it works in node's tests too. */
export const notOpen = new EventTarget()

export function noticeRefusal(code: unknown): void {
  if (code === NOT_OPEN_CODE) notOpen.dispatchEvent(new Event('refused'))
}
