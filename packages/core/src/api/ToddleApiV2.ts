import { getActionsInAction } from '../component/actionUtils'
import { ActionModel } from '../component/component.types'
import { type Formula } from '../formula/formula'
import { GlobalFormulas } from '../formula/formulaTypes'
import {
  getFormulasInAction,
  getFormulasInFormula,
} from '../formula/formulaUtils'
import { isDefined } from '../utils/util'
import { ApiRequest } from './apiTypes'

export class ToddleApiV2<Handler> implements ApiRequest {
  private api: ApiRequest
  private _apiReferences?: Set<string>
  private key: string
  private globalFormulas: GlobalFormulas<Handler>

  constructor(
    api: ApiRequest,
    apiKey: string,
    globalFormulas: GlobalFormulas<Handler>,
  ) {
    this.api = api
    this.key = apiKey
    this.globalFormulas = globalFormulas
  }

  get apiReferences(): Set<string> {
    if (this._apiReferences) {
      // Only compute apiReferences once
      return this._apiReferences
    }
    const apis = new Set<string>()
    const visitFormulaReference = (formula?: Formula | null) => {
      if (!isDefined(formula)) {
        return
      }
      switch (formula.type) {
        case 'path':
          if (formula.path[0] === 'Apis') {
            apis.add(formula.path[1])
          }
          break
        case 'value':
          break
        case 'record':
          formula.entries.forEach((entry) =>
            visitFormulaReference(entry.formula),
          )
          break
        case 'function':
        case 'array':
        case 'or':
        case 'and':
        case 'apply':
        case 'object':
          formula.arguments?.forEach((arg) =>
            visitFormulaReference(arg.formula),
          )
          break
        case 'switch':
          formula.cases.forEach((c) => {
            visitFormulaReference(c.condition)
            visitFormulaReference(c.formula)
          })
          break
      }
    }
    visitFormulaReference(this.api.autoFetch)
    visitFormulaReference(this.api.url)
    Object.values(this.api.path ?? {}).forEach((p) =>
      visitFormulaReference(p.formula),
    )
    Object.values(this.api.headers ?? {}).forEach((h) =>
      visitFormulaReference(h.formula),
    )
    visitFormulaReference(this.api.body)
    Object.values(this.api.inputs).forEach((arg) =>
      visitFormulaReference(arg.formula),
    )
    Object.values(this.api.queryParams ?? {}).forEach((q) => {
      visitFormulaReference(q.formula)
    })
    visitFormulaReference(this.api.server?.proxy?.enabled?.formula)
    visitFormulaReference(this.api.server?.ssr?.enabled?.formula)
    visitFormulaReference(this.api.client?.debounce?.formula)
    Object.values(this.api.redirectRules ?? {}).forEach((rule) => {
      visitFormulaReference(rule.formula)
    })
    visitFormulaReference(this.api.isError?.formula)
    visitFormulaReference(this.api.timeout?.formula)
    // Ensure self references are not included - for instance if an API references its
    // own response in a redirect rule
    apis.delete(this.key)

    this._apiReferences = apis
    return apis
  }

  get version() {
    return this.api.version
  }

  get name() {
    return this.api.name
  }

  get type() {
    return this.api.type
  }

  get autoFetch() {
    return this.api.autoFetch
  }

  get url() {
    return this.api.url
  }

  get path() {
    return this.api.path
  }

  get headers() {
    return this.api.headers
  }

  set headers(headers) {
    this.api.headers = headers
  }

  get method() {
    return this.api.method
  }

  get body() {
    return this.api.body
  }

  get inputs() {
    return this.api.inputs
  }

  get queryParams() {
    return this.api.queryParams
  }

  get server() {
    return this.api.server
  }

  get client() {
    return this.api.client
  }

  get redirectRules() {
    return this.api.redirectRules
  }

  get isError() {
    return this.api.isError
  }

  get timeout() {
    return this.api.timeout
  }

  *formulasInApi(): Generator<[(string | number)[], Formula]> {
    const api = this.api
    const apiKey = this.key
    for (const [input, value] of Object.entries(this.api.inputs)) {
      yield* getFormulasInFormula(value.formula, this.globalFormulas, [
        'apis',
        apiKey,
        'inputs',
        input,
        'formula',
      ])
    }
    yield* getFormulasInFormula(api.autoFetch, this.globalFormulas, [
      'apis',
      apiKey,
      'autoFetch',
    ])
    yield* getFormulasInFormula(api.url, this.globalFormulas, [
      'apis',
      apiKey,
      'url',
    ])
    for (const [pathKey, path] of Object.entries(api.path ?? {})) {
      yield* getFormulasInFormula(path.formula, this.globalFormulas, [
        'apis',
        apiKey,
        'path',
        pathKey,
        'formula',
      ])
    }
    for (const [queryParamKey, queryParam] of Object.entries(
      api.queryParams ?? {},
    )) {
      yield* getFormulasInFormula(queryParam.formula, this.globalFormulas, [
        'apis',
        apiKey,
        'queryParams',
        queryParamKey,
        'formula',
      ])
      yield* getFormulasInFormula(queryParam.enabled, this.globalFormulas, [
        'apis',
        apiKey,
        'queryParams',
        queryParamKey,
        'enabled',
      ])
    }

    for (const [headerKey, header] of Object.entries(api.headers ?? {})) {
      yield* getFormulasInFormula(header.formula, this.globalFormulas, [
        'apis',
        apiKey,
        'headers',
        headerKey,
        'formula',
      ])
      yield* getFormulasInFormula(header.enabled, this.globalFormulas, [
        'apis',
        apiKey,
        'headers',
        headerKey,
        'enabled',
      ])
    }

    yield* getFormulasInFormula(api.body, this.globalFormulas, [
      'apis',
      apiKey,
      'body',
    ])
    for (const [actionKey, action] of Object.entries(
      api.client?.onCompleted?.actions ?? {},
    )) {
      yield* getFormulasInAction(action, this.globalFormulas, [
        'apis',
        apiKey,
        'client',
        'onCompleted',
        'actions',
        actionKey,
      ])
    }
    for (const [actionKey, action] of Object.entries(
      api.client?.onFailed?.actions ?? {},
    )) {
      yield* getFormulasInAction(action, this.globalFormulas, [
        'apis',
        apiKey,
        'client',
        'onFailed',
        'actions',
        actionKey,
      ])
    }
    yield* getFormulasInFormula(
      api.client?.debounce?.formula,
      this.globalFormulas,
      ['apis', apiKey, 'client', 'debounce', 'formula'],
    )
    for (const [actionKey, action] of Object.entries(
      api.client?.onMessage?.actions ?? {},
    )) {
      yield* getFormulasInAction(action, this.globalFormulas, [
        'apis',
        apiKey,
        'client',
        'onData',
        'actions',
        actionKey,
      ])
    }
    for (const [rule, value] of Object.entries(api.redirectRules ?? {})) {
      yield* getFormulasInFormula(value.formula, this.globalFormulas, [
        'apis',
        apiKey,
        'redirectRules',
        rule,
        'formula',
      ])
    }
    yield* getFormulasInFormula(api.isError?.formula, this.globalFormulas, [
      'apis',
      apiKey,
      'isError',
      'formula',
    ])
    yield* getFormulasInFormula(api.timeout?.formula, this.globalFormulas, [
      'apis',
      apiKey,
      'timeout',
      'formula',
    ])
    yield* getFormulasInFormula(
      api.server?.proxy?.enabled.formula,
      this.globalFormulas,
      ['apis', apiKey, 'server', 'proxy', 'enabled', 'formula'],
    )
    yield* getFormulasInFormula(
      api.server?.ssr?.enabled?.formula,
      this.globalFormulas,
      ['apis', apiKey, 'server', 'ssr', 'enabled', 'formula'],
    )
  }

  *actionModelsInApi(): Generator<[(string | number)[], ActionModel]> {
    for (const [actionKey, action] of Object.entries(
      this.api.client?.onCompleted?.actions ?? {},
    )) {
      yield* getActionsInAction(action, [
        'apis',
        this.key,
        'client',
        'onCompleted',
        'actions',
        actionKey,
      ])
    }
    for (const [actionKey, action] of Object.entries(
      this.api.client?.onFailed?.actions ?? {},
    )) {
      yield* getActionsInAction(action, [
        'apis',
        this.key,
        'client',
        'onFailed',
        'actions',
        actionKey,
      ])
    }
    for (const [actionKey, action] of Object.entries(
      this.api.client?.onMessage?.actions ?? {},
    )) {
      yield* getActionsInAction(action, [
        'apis',
        this.key,
        'client',
        'onData',
        'actions',
        actionKey,
      ])
    }
  }
}
