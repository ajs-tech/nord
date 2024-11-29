import { valueFormula } from '@toddledev/core/dist/formula/formulaUtils'
import { searchProject } from '../searchProject'
import { unknownCookieRule } from './unknownCookieRule'

describe('unknownCookie', () => {
  test('should report unknown cookies', () => {
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
                  headers: {
                    Authorization: {
                      formula: {
                        type: 'function',
                        name: '@toddle/getHttpOnlyCookie',
                        arguments: [
                          {
                            formula: {
                              type: 'value',
                              value: 'unknown',
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
              attributes: {},
              variables: {},
            },
          },
        },
        rules: [unknownCookieRule],
        state: {
          cookiesAvailable: [{ name: 'known' } as any],
          isBrowserExtensionAvailable: true,
        },
      }),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0].code).toBe('unknown cookie')
  })
  test('should not report known cookies', () => {
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
                  headers: {
                    Authorization: {
                      formula: {
                        type: 'function',
                        name: '@toddle/getHttpOnlyCookie',
                        arguments: [
                          {
                            formula: {
                              type: 'value',
                              value: 'known',
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
              attributes: {},
              variables: {},
            },
          },
        },
        rules: [unknownCookieRule],
        state: {
          cookiesAvailable: [{ name: 'known' } as any],
          isBrowserExtensionAvailable: true,
        },
      }),
    )

    expect(problems).toHaveLength(0)
  })
})
