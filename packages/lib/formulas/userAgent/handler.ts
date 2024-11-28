import type { FormulaHandler } from '@toddledev/core/dist/types'

const handler: FormulaHandler<string> = (_, { env }) => {
  if (!env.isServer) {
    return window.navigator.userAgent
  } else {
    return env.request?.headers['user-agent'] ?? null
  }
}

export default handler
