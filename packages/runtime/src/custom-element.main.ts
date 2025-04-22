import * as libActions from '@nordcraft/std-lib/dist/actions'
import * as libFormulas from '@nordcraft/std-lib/dist/formulas'
import fastDeepEqual from 'fast-deep-equal'
import { defineComponents } from './custom-element/defineComponents'

const loadCorePlugins = (toddle = window.toddle) => {
  toddle.isEqual = fastDeepEqual

  // load default formulas and actions
  Object.entries(libFormulas).forEach(([name, module]) =>
    toddle.registerFormula(
      '@toddle/' + name,
      module.default as any,
      'getArgumentInputData' in module
        ? module.getArgumentInputData
        : undefined,
    ),
  )
  Object.entries(libActions).forEach(([name, module]) =>
    toddle.registerAction('@toddle/' + name, module.default),
  )
}

export { defineComponents, loadCorePlugins }
