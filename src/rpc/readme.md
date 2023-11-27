
# Concepts

The goal is to make us able to create web development **with** the library,
not restrict to the library. We provide function that compatible with bun
native `serve`, so we still have the lowest control.

In this specific rpc section, we create the typesafe api server library.
For templating or static file server, will be implemented in other library.

## Procedure

First, we create a **Procedure** object. Then we can add a middleware.
Middleware can set request state or intercept a request.

## Route

Then, we provide a validation function to validate the request body.

When we provide the function, we actually create new object
as oppose to modifying the underlying Procedure, we call
it **Route**. So ideally we want to store this in a variable.

Then we define the main handler for this Route.
This Route object contain a `run` method that accept
web standard Request and Response object.

## Router

The Route object only contain http method and the handler, path defined
here. This is the purpose of creating new object when defining new Route.

Ideally we want to safe the routes in an object, then parse the request
path to walk in that object to find the matching handler. This is like
file system routing but as an object.

## Typesafety

The ultimate goal is, in the client, we can make path from js Proxy that
typed as the object that contain all the routes. At the surface,
it looks like we calling a function in nested object, while in the engine
we create a path from that nested object.

## Error

We still exploring convinient way to create typesafe error handling.

currently possible error is hard coded as type, which can absolutely
be improved.

consideration:

### Error Class

```ts
class DuplicateError implement RPCError {
    serialize() {
        return { name: 'DUPLICATE', message: 'Username is not available' }
    }
}

const proc = procedure()
    .error({
        duplicate: DuplicateError
    })

    .query(() => {
        throw new DuplicateError()
    })



// client
const { data, error } = await client.query()

if (error && error.name == 'DUPLICATE') {
    return { message: error.message }
}
```

## Note

consideration

- should we modify the Procedure instead of creating new Route,  
  and just use typescript to map the object type  
  ! we cant, because no path defined in the procedure
- should we able to define route level middleware ?
- should we infer locals from middleware return type ?

pro

- auto type inference

cons

- no dynamic parameter, yet

terms

- event, is the handle argument that contain all request info
- data, is request body
- state, is request time data, represented as locals in event

todo

- client currently harcoded to have query and mutate function
- event locals currently hard coded as type

maybe

- should one route have multiple method ?


```ts
import { init, Infer } from "./rpc.dto"

// hard coded event type
const proc = init<{app: boolean}>()
  .use(e => e.locals = { app: false })

const auth = {
  login: proc
    .input(e => ({ username: '', password: '' }))

    // hard coded error
    .error<{ oof: {message: string} }>()

    // main handler
    .query(e => {
      if (!e.ctx) {
        throw e.error({ message: 'oof', name: 'oof' })
      }
      return Promise.resolve({ mong: e.data.username })
    })

}



// client usage

declare let client: Infer<typeof auth>

const { result, error } = await client.login.query({ username: 'oof', password: 'nice' })
```




