import type {
  Component,
  ComponentData,
} from '@toddledev/core/dist/component/component.types'
import type { FormulaContext } from '@toddledev/core/dist/formula/formula'
import { applyFormula } from '@toddledev/core/dist/formula/formula'
import { mapObject } from '@toddledev/core/dist/utils/collections'
import { isDefined } from '@toddledev/core/dist/utils/util'
import type { Signal } from '../signal/signal'
import type { ComponentContext } from '../types'

export function subscribeToContext(
  componentDataSignal: Signal<ComponentData>,
  component: Component,
  ctx: ComponentContext,
) {
  Object.entries(component.contexts ?? {}).forEach(
    ([providerName, context]) => {
      const provider =
        ctx.providers[[ctx.package, providerName].filter(isDefined).join('/')]

      if (provider) {
        context.formulas.forEach((formulaName) => {
          const formulaDataSignal = provider.formulaDataSignals[formulaName]
          if (!formulaDataSignal) {
            console.warn(
              `Provider ${providerName} does not expose a formula named "${formulaName}". Available formulas are: ["${Object.keys(
                provider.formulaDataSignals,
              ).join('", "')}"]`,
            )
            return
          }

          formulaDataSignal.subscribe((value) => {
            componentDataSignal.update((data) => ({
              ...data,
              Contexts: {
                ...data.Contexts,
                [providerName]: {
                  ...data.Contexts?.[providerName],
                  [formulaName]: value,
                },
              },
            }))
          })
        })
      }

      // In preview and absence of a real provider, we fake providers with their testData values. This is useful for testing components in isolation.
      // This is for preview mode only, and should preferably be stripped from the page and custom-elements runtime.
      else if (
        !provider &&
        ctx.env.runtime === 'preview' &&
        ctx.toddle._preview
      ) {
        const testProvider = ctx.components?.find(
          (comp) =>
            comp.name ===
            [ctx.package, providerName].filter(isDefined).join('/'),
        )

        if (!testProvider) {
          console.error(
            `Could not find provider "${providerName}". No such component exist.`,
          )
          return
        }

        // Derive the package name from the provider name as we do not have a real component to work with
        const [, testProviderPackage] = providerName.split('/').reverse()
        const formulaContext: FormulaContext = {
          data: {
            Attributes: mapObject(testProvider.attributes, ([name, attr]) => [
              name,
              attr.testValue,
            ]),
          },
          component: testProvider,
          root: ctx?.root,
          formulaCache: {},
          package: testProviderPackage ?? ctx?.package,
          toddle: ctx.toddle,
          env: ctx.env,
        }

        if (testProvider.route) {
          formulaContext.data['URL parameters'] = {
            ...Object.fromEntries(
              testProvider.route.path
                .filter((p) => p.type === 'param')
                .map((p) => [p.name, p.testValue]),
            ),
            ...mapObject(testProvider.route.query, ([name, { testValue }]) => [
              name,
              testValue,
            ]),
          }
        }
        formulaContext.data.Variables = mapObject(
          testProvider.variables,
          ([name, variable]) => [
            name,
            applyFormula(variable.initialValue, formulaContext),
          ],
        )

        componentDataSignal.update((data) => ({
          ...data,
          Contexts: {
            ...data.Contexts,
            [providerName]: Object.fromEntries(
              context.formulas.map((formulaName) => {
                const formula = testProvider.formulas?.[formulaName]
                if (!formula) {
                  console.warn(
                    `Could not find formula "${formulaName}" in component "${providerName}"`,
                  )
                  return [formulaName, null]
                }

                return [
                  formulaName,
                  applyFormula(formula.formula, formulaContext),
                ]
              }),
            ),
          },
        }))
      }
    },
  )
}
