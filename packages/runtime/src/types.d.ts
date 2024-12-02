import type {
  Component,
  ComponentData,
} from '@toddledev/core/dist/component/component.types'
import type { ToddleEnv } from '@toddledev/core/dist/formula/formula'
import type {
  Toddle as NewToddle,
  Toddle,
  ToddleInternals,
} from '@toddledev/core/dist/types'
import type { Signal } from './signal/signal'

declare global {
  interface Window {
    __components: Record<string, Signal<ComponentData>> // used for debugging
    __toddle: ToddleInternals
    toddle: NewToddle<LocationSignal, PreviewShowSignal>
  }
}

export type LocationSignal = Signal<{
  route: Component['route']
  page?: string
  path: string
  params: Record<string, string | null>
  query: Record<string, string | string[] | null>
  hash?: string
}>

export type PreviewShowSignal = Signal<{
  displayedNodes: string[]
  testMode: boolean
}>

interface ListItem {
  Item: unknown
  Index: number
  Parent?: ListItem
}

export interface ComponentChild {
  dataSignal: Signal<ComponentData>
  id: string
  path: string
  ctx: ComponentContext
}

export interface ComponentContext {
  component: Component
  components: Component[]
  package: string | undefined
  abortSignal: AbortSignal
  root: Document | ShadowRoot
  isRootComponent: boolean
  dataSignal: Signal<ComponentData>
  triggerEvent: (event: string, data: unknown) => void
  apis: Record<
    string,
    { fetch: Function; destroy: Function; update?: Function }
  >
  children: Record<string, Array<ComponentChild>>
  formulaCache: Record<
    string,
    {
      get: (data: ComponentData) => { hit: true; data: any } | { hit: false }
      set: (data: ComponentData, result: any) => void
    }
  >
  providers: Record<
    string,
    {
      component: Component
      formulaDataSignals: Record<string, Signal<ComponentData>>
      ctx: ComponentContext
    }
  >
  toddle: Toddle<LocationSignal, PreviewShowSignal>
  env: ToddleEnv
}

export type FormulaCache = Record<
  string,
  {
    get: (data: ComponentData) => { hit: true; data: any } | { hit: false }
    set: (data: ComponentData, result: any) => void
  }
>
