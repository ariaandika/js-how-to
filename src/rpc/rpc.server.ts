export interface Procedure<Locals = void> {
  use(handle: (event: { request: Request, locals: Locals }) => any): Procedure<Locals>
  input<Input>(validator: (b: unknown) => Input): Route<Locals,Input>
  clone(): Procedure<Locals>
}

export interface Route<
  Locals,
  Input,
  Output = void,
  Method extends 'query' | 'mutate' = never,
  Errors extends { name: Readonly<string> } = { name: 'unknown', message: string }
> {
  query<Out>(handle: (c: {
    locals: Locals,
    data: Input,
    request: Request,
    error(error: Errors | Omit<Errors,'name'>, code?: number): Errors
  }) => Out ): Route<Locals,Input,Out,'query',Errors>

  mutation<Out>(handle: (c: {
    locals: Locals,
    data: Input,
    request: Request,
    error(error: Errors | Omit<Errors,'name'>, code?: number): Errors
  }) => Out ): Route<Locals,Input,Out,'mutate',Errors>

  use<LocalLocals extends Record<string,any>>(handle: (event: {
    request: Request,
    locals: Locals & LocalLocals
  }) => any): Route<Locals&LocalLocals,Input,Output,Method,Errors>

  error<Err extends { name: Readonly<string> }>(): Route<Locals,Input,Output,Method,Errors | Err>
  run(req: Request): Output
}


export function procedure<T>(): Procedure<T>
export function procedure(): any {
  return {
    handles: [],
    use(handle: any) {
      this.handles.push(handle)
      return this
    },
    input(validator: any) {
      return Route(this.handles,validator)
    },
    clone() {
      return structuredClone(this)
    },
  }
}

function Route(middlewares: any[], validator: CallableFunction) {
  return {
    handle: void 0 as any,
    method: "GET",
    middlewares,
    mdlen: middlewares.length,
    validator,
    query(handle: any) {
      this.handle = handle
      this.method = 'GET'
      return this
    },
    mutation(handle: any) {
      this.handle = handle
      this.method = 'POST'
      return this
    },
    use(handle: any) {
      this.middlewares.push(handle)
      this.mdlen++
      return this
    },
    async run(req: Request) {
      try {
        const u = new URL(req.url)
        const event = { request: req, locals: {}, error(e:any){ return e } }

        for (let i = 0;i < this.mdlen;i++) {
          await middlewares[i](event)
        }

        const raw = req.method == 'GET' ?
          Object.fromEntries(u.searchParams.entries()) : 
          req.method == 'POST' ? await req.json() :
          void 0;

        const body = validator(raw)

        const res = await this.handle(Object.assign(event, { data: body }))

        const parsed = typeof res == 'object' ? JSON.stringify(res) : String(res)
        const t = typeof res === 'object' ? { "Content-Type": "application/json" } : void 0

        return new Response(parsed,{ headers: t })
      } catch (e) {
        if (e && typeof e == 'object' && "name" in e) {

        }
        throw e
      }
    },
    error() {return this},
    _isRpcRouter: true,
  }
}

export function initRouter(routes: Record<string,any>) {
  const _routes = compileRoute(routes) as any
  return async (req: Request): Promise<Response> => {
    const u = new URL(req.url)
    const matchRoute = _routes[u.pathname]

    if (!matchRoute)
      return new Response('',{ status: 404 })
    if (matchRoute.method !== req.method)
      return new Response('',{ status: 405 })

    return await matchRoute.run(req)
  }
}

function compileRoute(routes: Record<string,any>) {
  const r = {} as Record<string,Route<any,any>>
  compile(routes, '', r)
  return r
}

function compile(routes: unknown, route: string, out: Record<string,any>) {
  if (routes && typeof routes === 'object') {
    Object.entries(routes).map(([k,v]) => {

      if ("_isRpcRouter" in v) {
        out[`${route}/${k}`] = v
        return 
      }

      compile(v, `${route}/${k}`, out)
    })
  }
}

