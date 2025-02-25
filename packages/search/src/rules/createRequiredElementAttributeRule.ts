import { isDefined } from '@toddledev/core/dist/utils/util'
import type { Level, Rule } from '../types'

export function createRequiredElementAttributeRule(
  tag: string,
  attribute: string,
  level: Level = 'warning',
): Rule<{
  tag: string
  attribute: string
}> {
  return {
    code: 'required element attribute',
    level: level,
    category: 'Accessibility',
    visit: (report, { path, nodeType, value }) => {
      if (
        nodeType === 'component-node' &&
        value.type === 'element' &&
        value.tag === tag &&
        !isDefined(value.attrs[attribute])
      ) {
        report(path, { tag, attribute })
      }
    },
  }
}
