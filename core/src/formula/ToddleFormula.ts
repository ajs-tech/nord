import { Formula } from '../src/formula/formula'
import { getFormulasInFormula } from '../src/formula/formulaUtils'

export class ToddleFormula {
  private formula: Formula

  constructor({ formula }: { formula: Formula }) {
    this.formula = formula
  }

  /**
   * Traverse all formulas in the formula.
   * @returns An iterable that yields the path and formula.
   */
  *formulasInFormula(): Generator<[(string | number)[], Formula]> {
    yield* getFormulasInFormula(this.formula)
  }
}
