import type { FormulaHandler } from '@toddledev/core/dist/types'

const handler: FormulaHandler<string> = ([URIComponent]) => {
  if (typeof URIComponent !== 'string') {
    // throw new Error("Argument 'String' must be of type string")
    return null
  }
  return decodeURIComponent(URIComponent)
}

export default handler
