import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { signInStarts } from './sign-in.js'

/**
 * FE-37 (found by Rich's click): WHETHER A DRAFT'S SIGN-IN STARTS. The app's /login redirects
 * to the IdP, and the IdP's FIRST answer says whether it took the request: a 5xx is a refusal
 * ("no signature found on message"); anything else (its cookie redirect, its form) took it.
 * Against two real local servers, the app and the IdP.
 */
const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise((r) => server.close(r))
})

function serve(handler: (url: string) => { status: number; location?: string }) {
  return new Promise<string>((resolve) => {
    const server = createServer((request, response) => {
      const { status, location } = handler(request.url ?? '/')
      response.writeHead(status, location === undefined ? {} : { location })
      response.end()
    })
    servers.push(server)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(
        `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`,
      )
    })
  })
}

async function appBehind(idpStatus: number) {
  const idp = await serve(() => ({
    status: idpStatus,
    location: '/module.php/core/error/nocookie',
  }))
  return serve((url) =>
    url === '/login'
      ? {
          status: 302,
          location: `${idp}/module.php/saml/idp/singleSignOnService?SAMLRequest=x`,
        }
      : { status: 404 },
  )
}

describe('signInStarts (FE-37)', () => {
  it("the IdP's 500 on the app's request is refused", async () => {
    expect(await signInStarts(await appBehind(500))).toBe('refused')
  })

  it('the IdP taking it (its cookie redirect, or its form) is ok', async () => {
    expect(await signInStarts(await appBehind(302))).toBe('ok')
    expect(await signInStarts(await appBehind(200))).toBe('ok')
  })

  it('an app with no /login redirect, or one that cannot be reached, cannot be judged', async () => {
    const app = await serve(() => ({ status: 404 }))
    expect(await signInStarts(app)).toBe('unknown')
    expect(await signInStarts('http://127.0.0.1:1')).toBe('unknown')
  })
})
