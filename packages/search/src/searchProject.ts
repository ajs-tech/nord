import { isLegacyApi } from '@toddledev/core/dist/api/api'
import { ToddleComponent } from '@toddledev/core/dist/component/ToddleComponent'
import { isToddleFormula } from '@toddledev/core/dist/formula/formulaTypes'
import { ToddleFormula } from '@toddledev/core/dist/formula/ToddleFormula'
import type { ProjectFiles } from '@toddledev/ssr/dist/ssr.types'
import { ToddleApiService } from '@toddledev/ssr/dist/ToddleApiService'
import { ToddleRoute } from '@toddledev/ssr/dist/ToddleRoute'
import type { ApplicationState, NodeType, Result, Rule } from './types'
import { shouldSearchPath } from './util/helpers'

/**
 * Search a project by applying rules to all nodes in the project and returning reported results.
 *
 * @param files All files to check against
 * @param rules All rules to check against
 * @param pathsToVisit Only visit specific paths. All subpaths are visited as well. For example, ['components', 'test'] would visit everything under the test component. Defaults is `[]` which means all paths are visited.
 * @returns A generator that yields results as they are found
 */
export function* searchProject({
  files,
  rules,
  pathsToVisit = [],
  state,
}: {
  files: Omit<ProjectFiles, 'config'> & Partial<Pick<ProjectFiles, 'config'>>
  rules: Rule[]
  pathsToVisit?: string[][]
  state?: ApplicationState
}): Generator<Result> {
  const memos = new Map<string, any>()
  const memo = (key: string | string[], fn: () => any) => {
    const stringKey = Array.isArray(key) ? key.join('/') : key
    if (memos.has(stringKey)) {
      return memos.get(stringKey)
    }

    const result = fn()
    memos.set(stringKey, result)
    return result
  }

  for (const key in files.components) {
    const component = files.components[key]
    if (component) {
      yield* visitNode(
        {
          nodeType: 'component',
          value: component,
          path: ['components', key],
          rules,
          files,
          pathsToVisit,
          memo,
        },
        state,
      )
    }
  }

  for (const key in files.formulas) {
    yield* visitNode(
      {
        nodeType: 'project-formula',
        value: files.formulas[key],
        path: ['formulas', key],
        rules,
        files,
        pathsToVisit,
        memo,
      },
      state,
    )
  }

  for (const key in files.actions) {
    yield* visitNode(
      {
        nodeType: 'project-action',
        value: files.actions[key],
        path: ['actions', key],
        rules,
        files,
        pathsToVisit,
        memo,
      },
      state,
    )
  }

  for (const key in files.themes) {
    yield* visitNode(
      {
        nodeType: 'project-theme',
        value: files.themes[key],
        path: ['themes', key],
        rules,
        files,
        pathsToVisit,
        memo,
      },
      state,
    )
  }

  if (files.services) {
    for (const key in files.services) {
      yield* visitNode(
        {
          nodeType: 'api-service',
          value: files.services[key],
          path: ['services', key],
          rules,
          files,
          pathsToVisit,
          memo,
        },
        state,
      )
    }
  }

  if (files.routes) {
    for (const key in files.routes) {
      yield* visitNode(
        {
          nodeType: 'project-route',
          value: files.routes[key],
          path: ['routes', key],
          rules,
          files,
          pathsToVisit,
          memo,
        },
        state,
      )
    }
  }

  yield* visitNode(
    {
      nodeType: 'project-config',
      value: files.config,
      path: ['config'],
      rules,
      files,
      pathsToVisit,
      memo,
    },
    state,
  )
}

function* visitNode(
  args: {
    path: (string | number)[]
    rules: Rule[]
    files: Omit<ProjectFiles, 'config'> & Partial<Pick<ProjectFiles, 'config'>>
    pathsToVisit: string[][]
  } & NodeType,
  state: ApplicationState | undefined,
): Generator<Result> {
  const { rules, pathsToVisit, ...data } = args
  const { files, value, path, memo, nodeType } = data
  if (!shouldSearchPath(data.path, pathsToVisit)) {
    return
  }

  const results: Result[] = []
  for (const rule of rules) {
    rule.visit(
      (path, details) => {
        results.push({
          code: rule.code,
          category: rule.category,
          level: rule.level,
          path,
          details,
        })
      },
      data,
      state,
    )
  }

  for (const result of results) {
    yield result
  }

  switch (nodeType) {
    case 'component': {
      const component = new ToddleComponent<string>({
        component: value,
        packageName: undefined,
        getComponent: (name) => files.components[name],
        globalFormulas: {
          formulas: files.formulas,
          packages: files.packages,
        },
      })

      for (const key in value.attributes) {
        yield* visitNode(
          {
            nodeType: 'component-attribute',
            value: value.attributes[key],
            path: [...path, 'attributes', key],
            rules,
            files,
            pathsToVisit,
            memo,
            component,
          },
          state,
        )
      }

      for (const key in value.variables) {
        yield* visitNode(
          {
            nodeType: 'component-variable',
            value: value.variables[key],
            path: [...path, 'variables', key],
            rules,
            files,
            pathsToVisit,
            memo,
            component,
          },
          state,
        )
      }

      for (const key in value.apis) {
        const api = value.apis[key]
        yield* visitNode(
          {
            nodeType: 'component-api',
            value: api,
            component,
            path: [...path, 'apis', key],
            rules,
            files,
            pathsToVisit,
            memo,
          },
          state,
        )
        if (!isLegacyApi(api)) {
          for (const [inputKey, input] of Object.entries(api.inputs)) {
            yield* visitNode(
              {
                nodeType: 'component-api-input',
                value: input,
                api,
                component,
                path: [...path, 'apis', key, 'inputs', inputKey],
                rules,
                files,
                pathsToVisit,
                memo,
              },
              state,
            )
          }
        }
      }

      for (const key in value.formulas) {
        yield* visitNode(
          {
            nodeType: 'component-formula',
            value: value.formulas[key],
            path: [...path, 'formulas', key],
            rules,
            files,
            pathsToVisit,
            memo,
            component,
          },
          state,
        )
      }

      for (const key in value.workflows) {
        yield* visitNode(
          {
            nodeType: 'component-workflow',
            value: value.workflows[key],
            path: [...path, 'workflows', key],
            rules,
            files,
            pathsToVisit,
            memo,
            component,
          },
          state,
        )
      }

      for (let i = 0; i < (value.events ?? []).length; i++) {
        const event = value.events?.[i]
        if (event) {
          yield* visitNode(
            {
              nodeType: 'component-event',
              path: [...path, 'events', i],
              rules,
              files,
              pathsToVisit,
              memo,
              value: { component, event },
            },
            state,
          )
        }
      }

      for (const key in value.contexts) {
        yield* visitNode(
          {
            nodeType: 'component-context',
            value: value.contexts[key],
            path: [...path, 'contexts', key],
            rules,
            files,
            pathsToVisit,
            memo,
          },
          state,
        )
      }

      for (const key in value.nodes) {
        yield* visitNode(
          {
            nodeType: 'component-node',
            value: value.nodes[key],
            path: [...path, 'nodes', key],
            rules,
            files,
            pathsToVisit,
            memo,
            component,
          },
          state,
        )
      }

      for (const [formulaPath, formula] of component.formulasInComponent()) {
        yield* visitNode(
          {
            nodeType: 'formula',
            value: formula,
            path: [...path, ...formulaPath],
            rules,
            files,
            pathsToVisit,
            memo,
            component,
          },
          state,
        )
      }

      for (const [actionPath, action] of component.actionModelsInComponent()) {
        yield* visitNode(
          {
            nodeType: 'action-model',
            value: action,
            path: [...path, ...actionPath],
            rules,
            files,
            pathsToVisit,
            memo,
            component,
          },
          state,
        )
      }
      break
    }

    case 'project-formula':
      if (isToddleFormula(value)) {
        const formula = new ToddleFormula({
          formula: value.formula,
          globalFormulas: {
            formulas: files.formulas,
            packages: files.packages,
          },
        })
        formula.formulasInFormula()
        for (const [formulaPath, f] of formula.formulasInFormula()) {
          yield* visitNode(
            {
              nodeType: 'formula',
              value: f,
              path: [...path, ...formulaPath],
              rules,
              files,
              pathsToVisit,
              memo,
            },
            state,
          )
        }
      }
      break

    case 'component-node':
      if (value.type === 'element') {
        const variants = value.variants
        if (variants) {
          for (let i = 0; i < variants.length; i++) {
            const variant = variants[i]
            yield* visitNode(
              {
                nodeType: 'style-variant',
                value: { variant, element: value },
                path: [...path, 'variants', i],
                rules,
                files,
                pathsToVisit,
                memo,
              },
              state,
            )
          }
        }
      }
      break

    case 'api-service': {
      const apiService = new ToddleApiService<string>({
        service: value,
        globalFormulas: {
          formulas: files.formulas,
          packages: files.packages,
        },
      })
      for (const [formulaPath, formula] of apiService.formulasInService()) {
        yield* visitNode(
          {
            nodeType: 'formula',
            value: formula,
            path: [...path, ...formulaPath],
            rules,
            files,
            pathsToVisit,
            memo,
          },
          state,
        )
      }
      break
    }

    case 'project-route': {
      const projectRoute = new ToddleRoute<string>({
        route: value,
        globalFormulas: {
          formulas: files.formulas,
          packages: files.packages,
        },
      })
      for (const [formulaPath, formula] of projectRoute.formulasInRoute()) {
        yield* visitNode(
          {
            nodeType: 'formula',
            value: formula,
            path: [...path, ...formulaPath],
            rules,
            files,
            pathsToVisit,
            memo,
          },
          state,
        )
      }
      break
    }
  }
}
