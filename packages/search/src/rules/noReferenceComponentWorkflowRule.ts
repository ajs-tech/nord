import { ToddleComponent } from '@toddledev/core/dist/component/ToddleComponent'
import type { Rule } from '../types'

export const noReferenceComponentWorkflowRule: Rule<{
  name: string
  contextSubscribers: string[]
}> = {
  code: 'no-reference component workflow',
  level: 'warning',
  category: 'No References',
  visit: (report, args) => {
    if (args.nodeType !== 'component-workflow') {
      return
    }

    const { path, files, value, component } = args

    const [, componentName, , workflowKey] = path
    const targetComponent = files.components[componentName]
    if (!targetComponent) {
      return
    }

    for (const [actionPath, action] of component.actionModelsInComponent()) {
      if (
        action.type === 'TriggerWorkflow' &&
        action.workflow === workflowKey &&
        // Disregard own workflow reference.
        !(actionPath[0] === 'workflows' && actionPath[1] === workflowKey)
      ) {
        return
      }
    }

    // It is possible that a formula is never used, but still has subscribers
    const contextSubscribers = []
    if (value.exposeInContext) {
      for (const _component of Object.values(files.components)) {
        // Enforce that the component is not undefined since we're iterating
        const component = _component!
        for (const [contextKey, context] of Object.entries(
          component.contexts ?? {},
        )) {
          if (
            contextKey === componentName &&
            context.workflows.includes(workflowKey.toString())
          ) {
            contextSubscribers.push(component.name)
            const contextComponent = new ToddleComponent({
              component,
              getComponent: (name) => files.components[name],
              packageName: undefined,
              globalFormulas: {
                formulas: files.formulas,
                packages: files.packages,
              },
            })
            for (const [
              ,
              action,
            ] of contextComponent.actionModelsInComponent()) {
              if (
                action.type === 'TriggerWorkflow' &&
                action.contextProvider === componentName &&
                action.workflow === workflowKey
              ) {
                return
              }
            }
          }
        }
      }
    }

    report(path, { contextSubscribers, name: value.name })
  },
}
