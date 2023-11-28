import type { Route } from "./rpc.server"

export function unwrap<T>(val: T | null): asserts val is T { if (val === null || val === undefined) throw val }

export type Infer<T extends Record<string,any>> = {
  [x in keyof T]: T[x] extends Route<any, infer Input, infer Output, infer Method, infer Errors> ? {
    [x in Method]: (
      data: Input,
      opt: Parameters<typeof fetch>[1]
    ) => Promise<{ data: Awaited<Output>, error: null, } | { data: null, error: Errors }>
  } : Infer<T[x]>
}

export function Client<T extends Record<string,any>>(url: string): Infer<T> {
  return new Proxy({} as any, {
    get(_, p) {
      return extend(p.toString(),url)
    },
  }) as any
}


const extend = (start: string, host: string) => {
  const proxy = new Proxy({ url: '/'+start }, {
    get(target, frag) {
      const fr = frag.toString()
      if (fr !== "query" && fr !== "mutate") {
        target.url += `/${fr}`
        return proxy
      }

      return async (data: any, opts: Parameters<typeof fetch>[1]) => {
        const method = fr == "query" ? "GET" : "POST";

        const headers: any = method == 'GET' ?
          opts?.headers ?? void 0 :
          Object.assign({ 'Content-Type': 'application/json' },opts?.headers)

        const opt = Object.assign({
          method,
          body: method == "GET" ? void 0 : JSON.stringify(data),
        } satisfies Parameters<typeof fetch>[1], opts, { headers })

        const query = fr == "query" ? `?${Object.entries(data)
          .map(([k,v]:any) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&")}` : ""

        // console.log(host+target.url+query, {opt})
        // return { url: host+target.url+query, opt }
        const res = await fetch(host+target.url+query, opt)
        if (res.status >= 400) {
          return { data: null, error: await res.json() }
        }
        return { data: await res.json(), error: null }
      }
    },
  }) as any

  return proxy
}







