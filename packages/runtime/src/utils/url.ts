import { isDefined } from '@toddledev/core/dist/utils/util'
import { compile } from 'path-to-regexp'
import type { Location } from '../types'

export const getLocationUrl = ({
  query,
  page,
  route,
  params,
  hash,
}: Location) => {
  let path: string
  if (route) {
    const pathSegments: string[] = []
    for (const segment of route.path) {
      if (segment.type === 'static') {
        pathSegments.push(segment.name)
      } else {
        const segmentValue = params[segment.name]
        if (isDefined(segmentValue)) {
          pathSegments.push(segmentValue)
        } else {
          // If a param is missing, we can't build the rest of the path
          break
        }
      }
    }
    path = '/' + pathSegments.join('/')
  } else {
    path = compile(page as string, { encode: encodeURIComponent })(params)
  }
  const hashString = hash === undefined || hash === '' ? '' : '#' + hash
  const queryString = Object.entries(query)
    .filter(([_, q]) => q !== null)
    .map(([key, value]) => {
      return `${encodeURIComponent(
        route?.query[key]?.name ?? key,
      )}=${encodeURIComponent(String(value))}`
    })
    .join('&')

  return `${path}${hashString}${
    queryString.length > 0 ? '?' + queryString : ''
  }`
}
