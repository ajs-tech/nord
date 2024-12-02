import { isLegacyApi, sortApiObjects } from '@toddledev/core/dist/api/api'
import type {
  ComponentData,
  ComponentNodeModel,
} from '@toddledev/core/dist/component/component.types'
import { applyFormula } from '@toddledev/core/dist/formula/formula'
import { mapObject } from '@toddledev/core/dist/utils/collections'
import { isDefined } from '@toddledev/core/dist/utils/util'
import { createLegacyAPI } from '../api/createAPI'
import { createAPI } from '../api/createAPIv2'
import { isContextProvider } from '../context/isContextProvider'
import { subscribeToContext } from '../context/subscribeToContext'
import { registerComponentToLogState } from '../debug/logState'
import { handleAction } from '../events/handleAction'
import { Signal, signal } from '../signal/signal'
import { ComponentChild, ComponentContext } from '../types'
import { createFormulaCache } from '../utils/createFormulaCache'
import { renderComponent } from './renderComponent'

export type RenderComponentNodeProps = {
  path: string
  node: ComponentNodeModel
  dataSignal: Signal<ComponentData>
  ctx: ComponentContext
  parentElement: Element | ShadowRoot
  instance: Record<string, string>
}

export function createComponent({
  node,
  path,
  dataSignal,
  ctx,
  parentElement,
  instance,
}: RenderComponentNodeProps): Element[] {
  const nodeLookupKey = [ctx.package, node.name].filter(isDefined).join('/')
  const component = ctx.components?.find((comp) => comp.name === nodeLookupKey)
  if (!component) {
    console.warn(
      `Could not find component "${nodeLookupKey}" for component "${
        ctx.component.name
      }". Available components are: ["${ctx.components
        .map((c) => c.name)
        .join('", "')}"]`,
    )
    return []
  }
  const attributesSignal = dataSignal.map((data) => {
    return mapObject(node.attrs, ([attr, value]) => [
      attr,
      value?.type !== 'value'
        ? applyFormula(value, {
            data,
            component: ctx.component,
            formulaCache: ctx.formulaCache,
            root: ctx.root,
            package: ctx.package,
            toddle: ctx.toddle,
            env: ctx.env,
          })
        : value?.value,
    ])
  })

  const componentDataSignal = signal<ComponentData>({
    Location: dataSignal.get().Location,
    Variables: mapObject(component.variables, ([name, variable]) => [
      name,
      applyFormula(variable.initialValue, {
        data: {
          Attributes: attributesSignal.get(),
        },
        component,
        formulaCache: ctx.formulaCache,
        root: ctx.root,
        package: ctx.package,
        toddle: ctx.toddle,
        env: ctx.env,
      }),
    ]),
    Attributes: attributesSignal.get(),
    Apis: mapObject(component.apis, ([name, api]) => [
      name,
      {
        data: null,
        isLoading:
          api.autoFetch &&
          applyFormula(api.autoFetch, {
            data: dataSignal.get(),
            component,
            formulaCache: ctx.formulaCache,
            root: ctx.root,
            package: ctx.package,
            toddle: ctx.toddle,
            env: ctx.env,
          })
            ? true
            : false,
        error: null,
      },
    ]),
  })
  registerComponentToLogState(component, componentDataSignal)
  subscribeToContext(componentDataSignal, component, ctx)

  // Call the abort signal if the component's datasignal is destroyed (component unmounted) to cancel any pending requests
  const abortController = new AbortController()
  componentDataSignal.subscribe(() => {}, {
    destroy: () =>
      abortController.abort(`Component ${component.name} unmounted`),
  })
  const formulaCache = createFormulaCache(component)

  // Note: this function must run procedurally to ensure apis (which are in correct order) can reference each other
  const apis: Record<string, { fetch: Function; destroy: Function }> = {}
  sortApiObjects(Object.entries(component.apis)).forEach(([name, api]) => {
    if (isLegacyApi(api)) {
      apis[name] = createLegacyAPI(api, {
        ...ctx,
        apis,
        component,
        dataSignal: componentDataSignal,
        abortSignal: abortController.signal,
        isRootComponent: false,
        formulaCache,
        package: node.package ?? ctx.package,
        triggerEvent: (eventTrigger, data) => {
          const eventHandler = Object.values(node.events).find(
            (e) => e.trigger === eventTrigger,
          )
          if (eventHandler) {
            eventHandler.actions.forEach((action) =>
              handleAction(action, { ...dataSignal.get(), Event: data }, ctx),
            )
          }
        },
      })
    } else {
      apis[name] = createAPI(api, {
        ...ctx,
        apis,
        component,
        dataSignal: componentDataSignal,
        abortSignal: abortController.signal,
        isRootComponent: false,
        formulaCache,
        package: node.package ?? ctx.package,
        triggerEvent: (eventTrigger, data) => {
          const eventHandler = Object.values(node.events).find(
            (e) => e.trigger === eventTrigger,
          )
          if (eventHandler) {
            eventHandler.actions.forEach((action) =>
              handleAction(action, { ...dataSignal.get(), Event: data }, ctx),
            )
          }
        },
      })
    }
  })

  const onEvent = (eventTrigger: string, data: any) => {
    const eventHandler = Object.values(node.events).find(
      (e) => e.trigger === eventTrigger,
    )
    if (eventHandler) {
      eventHandler.actions.forEach((action) =>
        handleAction(action, { ...dataSignal.get(), Event: data }, ctx),
      )
    }
  }

  let providers = ctx.providers
  if (isContextProvider(component)) {
    // Subscribe to exposed formulas and update the component's data signal
    const formulaDataSignals = Object.fromEntries(
      Object.entries(component.formulas ?? {})
        .filter(([, formula]) => formula.exposeInContext)
        .map(([name, formula]) => [
          name,
          componentDataSignal.map((data) =>
            applyFormula(formula.formula, {
              data,
              component,
              formulaCache: ctx.formulaCache,
              root: ctx.root,
              package: ctx.package,
              toddle: ctx.toddle,
              env: ctx.env,
            }),
          ),
        ]),
    )

    providers = {
      ...providers,
      [component.name]: {
        component,
        formulaDataSignals,
        ctx: {
          ...ctx,
          apis,
          component,
          dataSignal: componentDataSignal,
          abortSignal: abortController.signal,
          triggerEvent: onEvent,
        },
      },
    }
  }

  const children: Record<string, Array<ComponentChild>> = {}
  for (let i = 0; i < node.children.length; i++) {
    const childId = node.children[i]
    const childNode = ctx.component.nodes[childId]
    const slotName = childNode.slot ?? 'default'
    children[slotName] = children[slotName] ?? []
    children[slotName].push({
      id: childId,
      path: `${path}.${i}[${slotName}]`,
      dataSignal,
      ctx: {
        ...ctx,
        package: node.package ?? ctx.package,
      },
    })
  }

  attributesSignal.subscribe(
    (Attributes) =>
      componentDataSignal.update((data) => ({
        ...data,
        Attributes,
      })),
    { destroy: () => componentDataSignal.destroy() },
  )

  return renderComponent({
    dataSignal: componentDataSignal,
    component,
    components: ctx.components,
    path,
    root: ctx.root,
    isRootComponent: false,
    children,
    formulaCache,
    providers,
    apis,
    abortSignal: abortController.signal,
    package: node.package ?? ctx.package,
    parentElement,
    onEvent,
    toddle: ctx.toddle,
    env: ctx.env,
    // If the root node is another component, then append and forward previous instance
    instance:
      node.id === 'root'
        ? { ...instance, [ctx.component.name]: 'root' }
        : { [ctx.component.name]: node.id ?? '' },
  })
}
