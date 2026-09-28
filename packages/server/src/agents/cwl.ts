import { z } from 'zod/v4'
import { CHANGE } from '../build/moves.js'
import type { Change } from '../platform/source.js'
import { defineAgent } from '../runtime/agent.js'

/**
 * THE CWL SPECIALIST (F3; agents.md rule 2): proposes, never acts. It is given the plan's who
 * gets in, the instructor's PUID (from `listMembers`, never the session, FE-2), the emails the
 * person named, and the app's sign-in files. It answers the changes that make staff inside the
 * app (Decision 13, Rich's B). The lead commits them.
 */
export interface CwlBrief {
  plan: { whoGetsIn: string; youSee: string; studentsSee: string }
  staff: { instructorPuid: string; emails: string[] }
  files: { path: string; content: string }[]
}

export const Proposal = z.object({
  changes: z.array(CHANGE).min(1).max(10),
  summary: z.string().min(1).max(400),
})

export const CWL_PROMPT = [
  'You are the sign-in specialist on a team building a small web app for a university instructor. You propose changes; you never commit them: the lead does. You always speak as "we".',
  "The app is JavaScript, as ES modules, on the node-ts-mongo blueprint, which signs people in with CWL. A signed-in request has req.user.user: the person's attributes by friendly name, from the blueprint's bridge(profile). ubcEduCwlPuid is the only stable identifier; mail is their email.",
  'Staff are the instructor and the people they named. Write config/staff.json as {"puids": [...], "emails": [...]}, with exactly the instructor\'s PUID and the emails you are given, lower-case, and nobody else.',
  "Add the check as Express middleware after passport.session(), in front of the instructor's routes only: never in front of /healthz or the sign-in routes. A person is staff when their ubcEduCwlPuid is in puids, or their mail, lower-cased, is in emails. Read config/staff.json with readFileSync, or import it with { type: 'json' }.",
  "manifest.yaml's auth.attributes must include ubcEduCwlPuid and mail.",
  'Never add a package, a Dockerfile or an .npmrc. Write whole files. A relative import names its file exactly, with its extension.',
  'The summary tells the lead what you changed and why, in two or three sentences.',
].join('\n')

/** Decision 13: config/staff.json holds exactly the instructor's PUID and the named emails. */
function staffAsBriefed(brief: CwlBrief) {
  const want = [...new Set(brief.staff.emails.map((e) => e.trim().toLowerCase()))].sort()
  return ({ changes }: { changes: Change[] }): string | null => {
    const staff = changes.find((c) => c.op === 'write' && c.path === 'config/staff.json')
    if (staff === undefined || staff.op !== 'write') return 'no config/staff.json'
    let written: { puids?: unknown; emails?: unknown }
    try {
      written = JSON.parse(staff.content) as typeof written
    } catch {
      return 'config/staff.json is not JSON'
    }
    const puids = Array.isArray(written.puids) ? written.puids.map(String) : null
    const emails = Array.isArray(written.emails)
      ? [...new Set(written.emails.map((e) => String(e).trim().toLowerCase()))].sort()
      : null
    if (puids === null || puids.length !== 1 || puids[0] !== brief.staff.instructorPuid)
      return "staff PUIDs other than the instructor's alone"
    if (emails === null || JSON.stringify(emails) !== JSON.stringify(want))
      return 'staff emails other than the ones named'
    return null
  }
}

export const cwl = defineAgent({
  name: 'cwl',
  instructions: CWL_PROMPT,
  brief: (brief: CwlBrief) => [
    {
      role: 'user' as const,
      content: [
        'The plan says:',
        `Who gets in: ${brief.plan.whoGetsIn}`,
        `What the instructor sees: ${brief.plan.youSee}`,
        `What students see: ${brief.plan.studentsSee}`,
        '',
        `Staff: ${JSON.stringify(brief.staff)}`,
        '',
        "The app's sign-in files as they are:",
        ...brief.files.map((f) => `--- ${f.path}\n${f.content}`),
      ].join('\n'),
    },
  ],
  answer: Proposal,
  check: staffAsBriefed,
})
