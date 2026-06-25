import { writeFileSync } from 'fs'
import { join } from 'path'
import configureOpenAPI from '#/lib/configure-open-api'
import createApp from '#/lib/create-app'
import { startRtpWorker } from '#/lib/rtp.worker'
import auth from '#/modules/auth/auth.router'
import gameService from '#/modules/game-service.route'
import game from '#/modules/games/games.router'
import gameSpin from '#/modules/gamespins/gamespins.router'
import index from '#/modules/index.route'
import operator from '#/modules/operator/operator.router'
import php from '#/modules/php/php.router'
import pragmatic from '#/modules/pragmatic/pragmatic.router'
import redtiger from '#/modules/redtiger/redtiger.router'
import referrals from '#/modules/referral-code/referral.router'
import reward from '#/modules/rewards/reward.router'
import transactions from '#/modules/transaction/transaction.router'
import updates from '#/modules/updates/updates.router'
import users from '#/modules/user/user.router'
// import pragmatic from '#/modules/pragmatic/pragmatic.router'
import vip from '#/modules/vip/vip.router'
import wallet from '#/modules/wallet/wallet.router'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { extractToken } from './middlewares/auth.middleware'

const app = createApp()

/**
 * Dynamic CORS that reflects the exact allowed Origin and always enables credentials.
 * This is required so the browser accepts Set-Cookie on cross-site requests
 * (app.cocodr.xyz -> api.cocodr.xyz) for refresh_token.
 */
const allowedOrigins = new Set<string>([
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:9999',
  'http://localhost:3001',
  'http://localhost:3000',
  'https://slots.cocodr.xyz',
  'https://app.cocodr.xyz',
  'https://api.cocodr.xyz',
])

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (allowedOrigins.has(origin)) {
        return origin
      }
      return '' // Block by returning an empty string
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'Upgrade-Insecure-Requests',
      'Cache-Control',
      'Pragma',
    ],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    credentials: true,
    maxAge: 600,
    // preflight: (c) => {
    //     // Hono's cors middleware handles the 204 response for OPTIONS requests automatically
    //     return c.text('', 204)
    // }
  }),
)
configureOpenAPI(app)

app.use('/*', serveStatic({ root: './public' }))
app.post('/game/:gameName/server/*', async (c) => {
  // Redirect to an external URL (e.g., Google) with a 302 Found status code (default)
  console.log('redirecting to php')
  const gameName = c.req.param('gameName')
  console.log(gameName)
  const sessionId = c.req.queries('sessionId')
  const action = c.req.queries('action')
  const sessId = c.req.queries('sessId')
  const gameId = c.req.queries('gameId')
  const wantsfreerounds = c.req.queries('wantsfreerounds')
  const wantsreels = c.req.queries('wantsreels')
  const nocache = c.req.queries('no-cache')
  const rawAuth = c.req.header('authorization') ?? c.req.header('Authorization')
  const token = extractToken(c)
  const body = {
    action,
    sessId,
    sessionId,
    gameId,
    wantsfreerounds,
    wantsreels,
    nocache,
    token,
    rawAuth,
  }

  const externalUrl = `http://localhost:8000/game/${gameName}/server?sessionId=${sessionId}&action=${action}&sessId=${sessId}&gameId=${gameId}&wantsfreerounds=${wantsfreerounds}&wantsreels=${wantsreels}&no-cache=${nocache}`

  const response = await fetch(externalUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    // }).then(response => response.json())
  })

  // Log response details for debugging
  console.log('Response status:', response.status)
  // console.log('Response headers:', Object.fromEntries(response.headers))
  console.log('Response body used:', response.bodyUsed)

  // Check if body is already locked before reading
  if (response.bodyUsed) {
    console.error('ERROR: Response body already consumed/locked!')
    throw new Error('Response body already consumed')
  }

  const t = await response.text()
  console.log('Response text length:', t.length)
  console.log(t)
  console.log('Response body after text() call:', response.bodyUsed)

  // Instead of returning the original response, return a new response with the text
  return new Response(t, {
    status: response.status,
    headers: response.headers, //Object.fromEntries()
  })
})

const modules = [
  index,
  updates,
  users,
  transactions,
  reward,
  wallet,
  gameSpin,
  referrals,
  pragmatic,
  auth,
  game,
  vip,
  operator,
  redtiger,
  php,
] as const

modules.forEach((route) => {
  app.route('/api/', route)
})

app.route('/gs2c/ge/v3/gameService/', gameService)

// Serve the built Vite frontend when the Docker image contains ./dist.
app.use('/*', serveStatic({ root: './dist' }))
app.get('*', serveStatic({ path: './dist/index.html' }))

export type AppType = (typeof modules)[number]

// Function to download OpenAPI specification
async function downloadOpenAPISpec() {
  try {
    // Fetch the OpenAPI specification from the /doc endpoint
    const response = await fetch('http://localhost:9999/doc')
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`)
    }

    const openapiSpec = await response.json()

    // Write the specification to openapi.json in the root directory
    const rootDir = process.cwd()
    const openapiPath = join(rootDir + '/../', 'openapi.json')
    writeFileSync(openapiPath, JSON.stringify(openapiSpec, null, 2))

    console.log('OpenAPI specification saved to openapi.json')
  } catch (error) {
    console.error('Error downloading OpenAPI specification:', error)
  }
}

// Start the background worker
startRtpWorker()

// Download OpenAPI specification after a short delay to ensure server is ready
setTimeout(downloadOpenAPISpec, 1000)

export default app
