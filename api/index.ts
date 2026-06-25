
import app from './app'
import { websocketHandler } from './modules/websocket/websocket.handler'
import wsRouter from './modules/websocket/websocket.router'

const port = Number(process.env.PORT ?? 9999)

console.log(`Server is running on http://localhost:${port}`)

// Assign the server instance to a constant
const server = Bun.serve({
  port,

  fetch(req, server) {
    const url = new URL(req.url)
    const match = /^\/ws\/(?<topic>\w+)$/.exec(url.pathname)
    if (match) {
      return wsRouter.fetch(req, server)
    }

    // Fallback to Hono for all non-WebSocket requests.
    return app.fetch(req, server)
  },
  websocket: websocketHandler,
  error() {
    return new Response('Uh oh!!', { status: 500 })
  },
})
// Export the server instance
export { server }
