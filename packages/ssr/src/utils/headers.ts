import { PROXY_URL_HEADER } from '@nordcraft/core/dist/utils/url'

/**
 * Omit the `cookie` header from a set of headers.
 * This is useful when proxying requests for routes/proxied API requests
 * to ensure cookies are not forwarded.
 */
export const skipCookieHeader = (headers: Headers) => {
  const newHeaders = new Headers(headers)
  newHeaders.delete('cookie')
  return newHeaders
}

/**
 * Omit the x-toddle-url header from a set of headers.
 * Since this header is only relevant for toddle requests, it's not useful
 * for other services to receive this.
 */
export const skipToddleHeader = (headers: Headers) => {
  const newHeaders = new Headers(headers)
  newHeaders.delete(PROXY_URL_HEADER)
  return newHeaders
}
