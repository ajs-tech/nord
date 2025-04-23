import fastDeepEqual from 'fast-deep-equal'

export class Signal<T> {
  value: T
  subscribers: Set<{
    notify: (value: T) => void
    destroy?: () => void
  }>
  subscriptions: Array<() => void>

  constructor(value: T) {
    this.value = value
    this.subscribers = new Set()
    this.subscriptions = []
  }
  get() {
    return this.value
  }
  set(value: T) {
    // Short circuit and skip expensive `deepEqual` if there are not currently any subscribers
    if (this.subscribers.size === 0) {
      this.value = value
      return
    }

    if (fastDeepEqual(value, this.value) === false) {
      this.value = value
      this.subscribers.forEach(({ notify }) => notify(this.value))
    }
  }

  update(f: (current: T) => T) {
    this.set(f(this.value))
  }
  subscribe(notify: (value: T) => void, config?: { destroy?: () => void }) {
    const subscriber = { notify, destroy: config?.destroy }
    this.subscribers.add(subscriber)
    notify(this.value)
    return () => {
      this.subscribers.delete(subscriber)
    }
  }
  destroy() {
    this.subscribers.forEach(({ destroy }) => {
      destroy?.()
    })
    this.subscribers.clear()
    this.subscriptions?.forEach((f) => f())
  }
  cleanSubscribers() {
    this.subscribers.forEach(({ destroy }) => {
      destroy?.()
    })
    this.subscribers.clear()
  }
  map<T2>(f: (value: T) => T2): Signal<T2> {
    const signal2 = signal(f(this.value))
    signal2.subscriptions.push(
      this.subscribe((value) => signal2.set(f(value)), {
        destroy: () => signal2.destroy(),
      }),
    )
    return signal2
  }
}

export function signal<T>(value: T) {
  return new Signal(value)
}

if (typeof window !== 'undefined') {
  ;(window as any).signal = signal
  ;(window as any).deepEqual = fastDeepEqual
}
