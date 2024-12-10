import { Hono } from 'hono'
import { env } from 'hono/adapter'
import type { HonoEnv } from '../hono'
import { favicon } from './routes/favicon'
import { manifest } from './routes/manifest'
import { robots } from './routes/robots'
import { sitemap } from './routes/sitemap'
import { staticRouter } from './routes/static'
import { toddlePage } from './routes/toddlePage'
import { getProject } from './utils/project'

const app = new Hono<HonoEnv>()

// Static routes don't need access to the project
app.route('/_static', staticRouter)

// Load the project onto context to make it easier to use for other routes
app.use(async (c, next) => {
  const { template } = env(c)
  const project = getProject(template)
  if (!project) {
    return c.text('Project not found', { status: 404 })
  }
  c.env.project = project
  await next()
})

app.get('/sitemap.xml', sitemap)
app.get('/robots.txt', robots)
app.get('/manifest.json', manifest)
app.get('/favicon.ico', favicon)

// TODO: add missing routes below
// .toddle/custom-code
// .toddle/fonts/...
// .toddle/serviceWorker/...
// .toddle/omvej/...

app.get('/*', toddlePage)

export default app
