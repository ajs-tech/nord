import { ToddleComponent } from '@toddledev/core/dist/component/ToddleComponent'
import type { Formula } from '@toddledev/core/dist/formula/formula'
import { isToddleFormula } from '@toddledev/core/dist/formula/formulaTypes'
import { ToddleApiService } from '@toddledev/ssr/dist/ToddleApiService'
import type { Rule } from '../types'

export const noReferenceProjectFormulaRule: Rule<void> = {
  code: 'no-reference project formula',
  level: 'warning',
  category: 'No References',
  visit: (report, { path, files, value, nodeType, memo }) => {
    if (nodeType !== 'project-formula') {
      return
    }

    // Check in all API services first, since that should be quick
    for (const apiService of Object.values(files.services ?? {})) {
      const service = new ToddleApiService({
        service: apiService,
        globalFormulas: { formulas: files.formulas, packages: files.packages },
      })
      const formulas = service.formulasInService()
      for (const [_formulaPath, formula] of formulas) {
        // Check if the formula is used in the formula
        if (checkFormula(formula, value.name)) {
          return
        }
      }
    }

    const componentFormulaReferences = memo(
      'componentFormulaReferences',
      () => {
        const usedFormulas = new Set<string>()
        for (const component of Object.values(files.components)) {
          const c = new ToddleComponent({
            // Enforce that the component is not undefined since we're iterating
            component: component!,
            getComponent: (name) => files.components[name],
            packageName: undefined,
            globalFormulas: {
              formulas: files.formulas,
              packages: files.packages,
            },
          })
          for (const [, formula] of c.formulasInComponent()) {
            if (formula.type === 'function') {
              usedFormulas.add(formula.name)
            }
          }
        }
        return usedFormulas
      },
    )

    if (componentFormulaReferences.has(value.name)) {
      return
    }

    // TODO: Memoize similar to above. We need have a helper class `ToddleFormula` with `ToddleFormula.normalizeFormulas()`
    for (const f of Object.values(files.formulas ?? {})) {
      if (f.name === value.name) {
        continue
      }

      // Check if the formula is used in the formula
      if (isToddleFormula(f) && checkFormula(f.formula, value.name)) {
        return
      }
    }

    report(path)
  },
}

const checkArguments = (
  args: {
    formula: Formula
  }[],
  formulaName: string,
) => {
  args.forEach((a) => {
    if (checkFormula(a.formula, formulaName)) {
      return true
    }
  })
  return false
}

const checkFormula = (formula: Formula, formulaName: string) => {
  if (formula.type === 'function' && formula.name === formulaName) {
    return true
  }
  if (
    formula.type === 'object' ||
    formula.type === 'array' ||
    formula.type === 'or' ||
    formula.type === 'and' ||
    formula.type === 'apply'
  ) {
    checkArguments(formula.arguments ?? [], formulaName)
  }
  return false
}
