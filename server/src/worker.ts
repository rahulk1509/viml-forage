import { httpServerHandler } from 'cloudflare:node'
import { env } from 'cloudflare:workers'

type WorkerEnv = {
  DATABASE_URL: string
  JWT_SECRET: string
  FRONTEND_ORIGIN?: string
}

const workerEnv = env as unknown as WorkerEnv

process.env.DATABASE_URL = workerEnv.DATABASE_URL
process.env.JWT_SECRET = workerEnv.JWT_SECRET
process.env.FRONTEND_ORIGIN = workerEnv.FRONTEND_ORIGIN
process.env['NODE_ENV'] = 'production'

const { default: app } = await import('./app.js')

app.listen(3000)

export default httpServerHandler({ port: 3000 })
