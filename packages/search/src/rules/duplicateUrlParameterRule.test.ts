import { searchProject } from '../searchProject'
import { duplicateUrlParameterRule } from './duplicateUrlParameterRule'

describe('duplicateUrlParameterRule', () => {
  test('should detect duplicate URL parameters', () => {
    const problems = Array.from(
      searchProject({
        files: {
          formulas: {},
          components: {
            test: {
              name: 'test',
              nodes: {},
              formulas: {},
              apis: {},
              attributes: {},
              variables: {},
              route: {
                path: [
                  {
                    type: 'param',
                    name: 'id',
                    testValue: '1',
                  },
                  {
                    type: 'static',
                    name: 'name',
                  },
                ],
                query: {
                  id: {
                    name: 'id',
                    testValue: '1',
                  },
                },
              },
            },
          },
        },
        rules: [duplicateUrlParameterRule],
      }),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0].code).toBe('duplicate url parameter')
    expect(problems[0].path).toEqual([
      'components',
      'test',
      'route',
      'query',
      'id',
    ])
  })
  test('should not detect non-duplicate URL parameters', () => {
    const problems = Array.from(
      searchProject({
        files: {
          formulas: {},
          components: {
            test: {
              name: 'test',
              nodes: {},
              formulas: {},
              apis: {},
              attributes: {},
              variables: {},
              route: {
                path: [
                  {
                    type: 'param',
                    name: 'id',
                    testValue: '1',
                  },
                  {
                    type: 'static',
                    name: 'name',
                  },
                ],
                query: {
                  name: {
                    name: 'name',
                    testValue: '1',
                  },
                },
              },
            },
          },
        },
        rules: [duplicateUrlParameterRule],
      }),
    )

    expect(problems).toHaveLength(0)
  })
})
