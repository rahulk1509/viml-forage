import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import authRouter from './modules/auth/auth.routes.js'
import documentRouter, {
  projectDocumentRouter,
} from './modules/documents/document.routes.js'
import projectRouter from './modules/projects/project.routes.js'
import qualityRouter from './modules/quality/quality.routes.js'
import workOrderRouter from './modules/work-orders/work-order.routes.js'

const app = express()

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/documents', documentRouter)
app.use('/api/projects', projectDocumentRouter)
app.use('/api/projects', projectRouter)
app.use('/api', workOrderRouter)
app.use('/api', qualityRouter)

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (
      error instanceof SyntaxError &&
      'status' in error &&
      error.status === 400
    ) {
      response.status(400).json({ error: 'Invalid JSON request body' })
      return
    }

    console.error(error)
    response.status(500).json({ error: 'Internal server error' })
  },
)

export default app
