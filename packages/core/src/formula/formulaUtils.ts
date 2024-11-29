import type { ActionModel } from '../component/component.types'
import { isDefined } from '../utils/util'
import {
  Formula,
  FunctionOperation,
  isFormula,
  PathOperation,
  ValueOperation,
} from './formula'
import { GlobalFormulas, isToddleFormula } from './formulaTypes'

export const valueFormula = (
  value: string | number | boolean | null | object,
): ValueOperation => ({
  type: 'value',
  value,
})

export const pathFormula = (path: string[]): PathOperation => ({
  type: 'path',
  path,
})

export const functionFormula = (
  name: string,
  formula?: Omit<Partial<FunctionOperation>, 'type' | 'name'>,
): FunctionOperation => ({
  type: 'function',
  name,
  package: formula?.package,
  arguments: formula?.arguments ?? [],
  variableArguments: formula?.variableArguments,
})

export function* getFormulasInFormula<Handler>({
  formula,
  globalFormulas,
  path = [],
  visitedFormulas = new Set<string>(),
}: {
  formula: Formula | undefined | null
  globalFormulas: GlobalFormulas<Handler>
  path?: (string | number)[]
  visitedFormulas?: Set<string>
}): Generator<[(string | number)[], Formula]> {
  if (!isDefined(formula)) {
    return
  }

  yield [path, formula]
  switch (formula.type) {
    case 'path':
    case 'value':
      break
    case 'record':
      for (const [key, entry] of formula.entries.entries()) {
        yield* getFormulasInFormula({
          formula: entry.formula,
          globalFormulas,
          path: [...path, 'entries', key, 'formula'],
          visitedFormulas,
        })
      }
      break
    case 'function': {
      const globalFormula = formula.package
        ? globalFormulas.packages?.[formula.package]?.formulas?.[formula.name]
        : globalFormulas.formulas?.[formula.name]
      if (globalFormula) {
        const formulaKey = [formula.package, formula.name]
          .filter(isDefined)
          .join('/')
        if (visitedFormulas.has(formulaKey)) {
          // Prevent infinite loops when visiting global formulas (potentially in a package)
          break
        }
        visitedFormulas.add(formulaKey)
      }

      for (const [key, arg] of (
        (formula.arguments as typeof formula.arguments | undefined) ?? []
      ).entries()) {
        yield* getFormulasInFormula({
          formula: arg.formula,
          globalFormulas,
          path: [...path, 'arguments', key, 'formula'],
          visitedFormulas,
        })
      }
      // Lookup the actual function and traverse its potential formula references
      if (globalFormula && isToddleFormula(globalFormula)) {
        yield* getFormulasInFormula({
          formula: globalFormula.formula,
          globalFormulas,
          path: [...path, 'formula'],
          visitedFormulas,
        })
      }
      break
    }
    case 'array':
    case 'or':
    case 'and':
    case 'object':
      for (const [key, arg] of (
        (formula.arguments as typeof formula.arguments | undefined) ?? []
      ).entries()) {
        yield* getFormulasInFormula({
          formula: arg.formula,
          globalFormulas,
          path: [...path, 'arguments', key, 'formula'],
          visitedFormulas,
        })
      }
      break
    case 'apply':
      for (const [key, arg] of (
        (formula.arguments as typeof formula.arguments | undefined) ?? []
      ).entries()) {
        yield* getFormulasInFormula({
          formula: arg.formula,
          globalFormulas,
          path: [...path, 'arguments', key, 'formula'],
          visitedFormulas,
        })
      }
      break
    case 'switch':
      for (const [key, c] of formula.cases.entries()) {
        yield* getFormulasInFormula({
          formula: c.condition,
          globalFormulas,
          path: [...path, 'cases', key, 'condition'],
          visitedFormulas,
        })
        yield* getFormulasInFormula({
          formula: c.formula,
          globalFormulas,
          path: [...path, 'cases', key, 'formula'],
          visitedFormulas,
        })
      }
      yield* getFormulasInFormula({
        formula: formula.default,
        globalFormulas,
        path: [...path, 'default'],
        visitedFormulas,
      })
      break
  }
}
export function* getFormulasInAction<Handler>({
  action,
  globalFormulas,
  path = [],
  visitedFormulas = new Set<string>(),
}: {
  action: ActionModel | null
  globalFormulas: GlobalFormulas<Handler>
  path?: (string | number)[]
  visitedFormulas?: Set<string>
}): Generator<[(string | number)[], Formula]> {
  if (!isDefined(action)) {
    return
  }

  switch (action.type) {
    case 'Fetch':
      for (const [inputKey, input] of Object.entries(action.inputs ?? {})) {
        yield* getFormulasInFormula({
          formula: input.formula,
          globalFormulas,
          path: [...path, 'input', inputKey, 'formula'],
          visitedFormulas,
        })
      }
      for (const [key, a] of Object.entries(action.onSuccess?.actions ?? {})) {
        yield* getFormulasInAction({
          action: a,
          globalFormulas,
          path: [...path, 'onSuccess', 'actions', key],
          visitedFormulas,
        })
      }
      for (const [key, a] of Object.entries(action.onError?.actions ?? {})) {
        yield* getFormulasInAction({
          action: a,
          globalFormulas,
          path: [...path, 'onError', 'actions', key],
          visitedFormulas,
        })
      }
      break
    case 'Custom':
    case undefined:
      if (isFormula(action.data)) {
        yield* getFormulasInFormula({
          formula: action.data,
          globalFormulas,
          path: [...path, 'data'],
          visitedFormulas,
        })
      }
      for (const [key, a] of Object.entries(action.arguments ?? {})) {
        yield* getFormulasInFormula({
          formula: a.formula,
          globalFormulas,
          path: [...path, 'arguments', key, 'formula'],
          visitedFormulas,
        })
      }

      for (const [eventKey, event] of Object.entries(action.events ?? {})) {
        for (const [key, a] of Object.entries(event.actions ?? {})) {
          yield* getFormulasInAction({
            action: a,
            globalFormulas,
            path: [...path, 'events', eventKey, 'actions', key],
            visitedFormulas,
          })
        }
      }
      break
    case 'SetVariable':
    case 'SetURLParameter':
    case 'TriggerEvent':
      yield* getFormulasInFormula({
        formula: action.data,
        globalFormulas,
        path: [...path, 'data'],
        visitedFormulas,
      })
      break
    case 'TriggerWorkflow':
      for (const [key, a] of Object.entries(action.parameters ?? {})) {
        yield* getFormulasInFormula({
          formula: a.formula,
          globalFormulas,
          path: [...path, 'parameters', key, 'formula'],
          visitedFormulas,
        })
      }
      break
    case 'Switch':
      if (isDefined(action.data) && isFormula(action.data)) {
        yield* getFormulasInFormula({
          formula: action.data,
          globalFormulas,
          path: [...path, 'data'],
          visitedFormulas,
        })
      }
      for (const [key, c] of action.cases.entries()) {
        yield* getFormulasInFormula({
          formula: c.condition,
          globalFormulas,
          path: [...path, 'cases', key, 'condition'],
          visitedFormulas,
        })
        for (const [actionKey, a] of Object.entries(c.actions)) {
          yield* getFormulasInAction({
            action: a,
            globalFormulas,
            path: [...path, 'cases', key, 'actions', actionKey],
            visitedFormulas,
          })
        }
      }
      for (const [actionKey, a] of Object.entries(action.default.actions)) {
        yield* getFormulasInAction({
          action: a,
          globalFormulas,
          path: [...path, 'default', 'actions', actionKey],
          visitedFormulas,
        })
      }
      break
  }
}
