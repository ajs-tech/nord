import { valueFormula } from '@toddledev/core/dist/formula/formulaUtils'
import { searchProject } from '../../searchProject'
import { invalidApiParserModeRule } from './invalidApiParserModeRule'

describe('invalidApiParserMode', () => {
  test('should report invalid parser modes for an API with SSR enabled', () => {
    const problems = Array.from(
      searchProject({
        files: {
          components: {
            test: {
              name: 'test',
              nodes: {},
              formulas: {},
              apis: {
                'my-api': {
                  name: 'my-api',
                  type: 'http',
                  version: 2,
                  autoFetch: valueFormula(true),
                  inputs: {},
                  '@toddle/metadata': {
                    comments: null,
                  },
                  server: {
                    ssr: {
                      enabled: { formula: valueFormula(true) },
                    },
                  },
                  client: {
                    parserMode: 'blob',
                  },
                },
              },
              attributes: {},
              variables: {},
            },
          },
        },
        rules: [invalidApiParserModeRule],
      }),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0].code).toBe('invalid api parser mode')
    expect(problems[0].details).toEqual({ api: 'my-api' })
  })

  test('should not report valid parser modes', () => {
    const problems = Array.from(
      searchProject({
        files: {
          components: {
            test: {
              name: 'test',
              nodes: {},
              formulas: {},
              apis: {
                'my-api': {
                  name: 'my-api',
                  type: 'http',
                  version: 2,
                  autoFetch: valueFormula(true),
                  inputs: {},
                  server: {
                    ssr: {
                      enabled: { formula: valueFormula(true) },
                    },
                  },
                  client: {
                    parserMode: 'json',
                  },
                  '@toddle/metadata': {
                    comments: null,
                  },
                },
              },
              attributes: {},
              variables: {},
            },
          },
        },
        rules: [invalidApiParserModeRule],
      }),
    )

    expect(problems).toEqual([])
  })
})
