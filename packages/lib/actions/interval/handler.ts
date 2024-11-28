import { ActionHandler } from '@toddledev/core/dist/types'
import { isDefined } from '@toddledev/core/dist/utils/util'

const handler: ActionHandler = ([delay], ctx) => {
  // We'll cast delay in case it's passed as a string
  const delayNumber = Number(delay)
  if (!isDefined(delay) || Number.isNaN(delay)) {
    throw new Error('Invalid delay value')
  }
  const interval = setInterval(
    () => ctx.triggerActionEvent('tick', null),
    delayNumber,
  )
  ctx.abortSignal.addEventListener('abort', () => {
    clearInterval(interval)
  })
}

export default handler
