import { ElementNodeModel } from '@toddledev/core/dist/component/component.types'
import { applyFormula } from '@toddledev/core/dist/formula/formula'
import {
  getClassName,
  toValidClassName,
} from '@toddledev/core/dist/styling/className'
import { isDefined, toBoolean } from '@toddledev/core/dist/utils/util'
import { handleAction } from '../events/handleAction'
import type { Signal } from '../signal/signal'
import { getDragData } from '../utils/getDragData'
import { getElementTagName } from '../utils/getElementTagName'
import { setAttribute } from '../utils/setAttribute'
import { NodeRenderer, createNode } from './createNode'

export function createElement({
  node,
  dataSignal,
  id,
  path,
  ctx,
  isSvg,
  instance,
}: NodeRenderer<ElementNodeModel>): Element {
  const tag = getElementTagName(node, ctx, id)
  const elem =
    isSvg || tag === 'svg'
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag)

  elem.setAttribute('data-node-id', id)
  if (path) {
    elem.setAttribute('data-id', path)
  }
  if (ctx.isRootComponent === false && id !== 'root') {
    elem.setAttribute('data-component', ctx.component.name)
  }
  const classHash = getClassName([node.style, node.variants])
  elem.classList.add(classHash)
  if (instance && id === 'root') {
    Object.entries(instance).forEach(([key, value]) => {
      elem.classList.add(toValidClassName(`${key}:${value}`))
    })
  }
  if (node.classes) {
    Object.entries(node.classes)?.forEach(([className, { formula }]) => {
      if (formula) {
        const classSignal = dataSignal.map((data) =>
          toBoolean(
            applyFormula(formula, {
              data,
              component: ctx.component,
              formulaCache: ctx.formulaCache,
              root: ctx.root,
              package: ctx.package,
              toddle: ctx.toddle,
              env: ctx.env,
            }),
          ),
        )
        classSignal.subscribe((show) =>
          show
            ? elem.classList.add(className)
            : elem.classList.remove(className),
        )
      } else {
        elem.classList.add(className)
      }
    })
  }

  Object.entries(node.attrs).forEach(([attr, value]) => {
    if (!isDefined(value)) {
      return
    }
    let o: Signal<any> | undefined
    const setupAttribute = () => {
      if (value.type === 'value') {
        setAttribute(elem, attr, value?.value)
      } else {
        o = dataSignal.map((data) =>
          applyFormula(value, {
            data,
            component: ctx.component,
            formulaCache: ctx.formulaCache,
            root: ctx.root,
            package: ctx.package,
            toddle: ctx.toddle,
            env: ctx.env,
          }),
        )
        o.subscribe((val) => {
          setAttribute(elem, attr, val)
        })
      }
    }
    if (
      attr === 'autofocus' &&
      ctx.env.runtime === 'preview' &&
      window.toddle._preview
    ) {
      window.toddle._preview.showSignal.subscribe(({ testMode }) => {
        if (testMode) {
          setupAttribute()
        } else {
          o?.destroy()
          elem.removeAttribute(attr)
        }
      })
    } else {
      setupAttribute()
    }
  })
  node['style-variables']?.forEach(({ formula, name, unit }) => {
    const sig = dataSignal.map((data) => {
      const value = applyFormula(formula, {
        data,
        component: ctx.component,
        formulaCache: ctx.formulaCache,
        root: ctx.root,
        package: ctx.package,
        toddle: ctx.toddle,
        env: ctx.env,
      })
      return unit ? value + unit : value
    })
    sig.subscribe((value) => elem.style.setProperty(`--${name}`, value))
  })
  Object.values(node.events).forEach((event) => {
    const handler = (e: Event) => {
      event.actions.forEach((action) => {
        if (e instanceof DragEvent) {
          ;(e as any).data = getDragData(e)
        }
        if (e instanceof ClipboardEvent) {
          try {
            ;(e as any).data = Array.from(e.clipboardData?.items ?? []).reduce<
              Record<string, any>
            >((dragData, item) => {
              try {
                dragData[item.type] = JSON.parse(
                  e.clipboardData?.getData(item.type) as any,
                )
              } catch {
                dragData[item.type] = e.clipboardData?.getData(item.type)
              }
              return dragData
            }, {})
          } catch (e) {
            console.error('Could not get paste data')
            console.error(e)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleAction(action, { ...dataSignal.get(), Event: e }, ctx, e)
      })
      return false
    }
    elem.addEventListener(event.trigger, handler)
  })

  // for script and style tags we just render the first text child.
  if (
    node.tag.toLocaleLowerCase() === 'script' ||
    node.tag.toLocaleLowerCase() === 'style'
  ) {
    const childId = node.children[0]
    const childNode = childId ? ctx.component.nodes[childId] : undefined
    if (childNode?.type === 'text') {
      if (childNode.value.type === 'value') {
        elem.textContent = String(childNode.value.value)
      } else {
        const textSignal = dataSignal.map((data) => {
          return String(
            applyFormula(childNode.value, {
              data,
              component: ctx.component,
              formulaCache: ctx.formulaCache,
              root: ctx.root,
              package: ctx.package,
              toddle: ctx.toddle,
              env: ctx.env,
            }),
          )
        })
        textSignal.subscribe((value) => {
          elem.textContent = value
        })
      }
    }
  } else {
    node.children.forEach((child, i) => {
      const childNodes = createNode({
        parentElement: elem,
        id: child,
        path: path + '.' + i,
        dataSignal,
        ctx,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        isSvg: isSvg || tag === 'svg',
        instance,
      })
      childNodes.forEach((childNode) => elem.appendChild(childNode))
    })
  }

  return elem
}
