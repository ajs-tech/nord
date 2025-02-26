import type { Formula } from '@toddledev/core/dist/formula/formula'
import type { GlobalFormulas } from '@toddledev/core/dist/formula/formulaTypes'
import { getFormulasInFormula } from '@toddledev/core/dist/formula/formulaUtils'
import type { ApiService } from './ssr.types'

export class ToddleApiService<Handler> {
  private service: ApiService
  private globalFormulas: GlobalFormulas<Handler>

  constructor({
    service,
    globalFormulas,
  }: {
    service: ApiService
    globalFormulas: GlobalFormulas<Handler>
  }) {
    this.service = service
    this.globalFormulas = globalFormulas
  }

  /**
   * Traverse all formulas in the API Service.
   * @returns An iterable that yields the path and formula.
   */
  *formulasInService(): Generator<[(string | number)[], Formula]> {
    const globalFormulas = this.globalFormulas

    yield* getFormulasInFormula({
      formula: this.service.baseUrl,
      globalFormulas,
      path: ['baseUrl'],
    })
    yield* getFormulasInFormula({
      formula: this.service.docsUrl,
      globalFormulas,
      path: ['docsUrl'],
    })
    yield* getFormulasInFormula({
      formula: this.service.apiKey,
      globalFormulas,
      path: ['apiKey'],
    })
    if (this.service.type === 'supabase') {
      yield* getFormulasInFormula({
        formula: this.service.meta?.projectUrl,
        globalFormulas,
        path: ['meta', 'projectUrl'],
      })
    }
  }

  get name() {
    return this.service.name
  }
  get baseUrl() {
    return this.service.baseUrl
  }
  get docsUrl() {
    return this.service.docsUrl
  }
  get apiKey() {
    return this.service.apiKey
  }
  get meta() {
    return this.service.meta
  }
}
