
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

We still exploring convinient way to create a typesafe error handling.

consideration:

- register error as class

the class will implement `serialize` method that, if the class thrown,
what value should be returned

- generic custom error

a custom error that the handling will always be just showing the message
to the user

- the unknown error

an unexpected error that should have proper handling or at least transforming
because it most likely contain sensitive information

```ts
class DuplicateError implements RPCError {
    serialize() {
        return { name: 'DUPLICATE', message: 'Username is not available' }
    }
}

const proc = procedure()
    .error({
        duplicate: DuplicateError
    })
    .query(({ error }) => {
        // generic custom error
        throw error(404, 'Not Found')
        // class error
        throw new DuplicateError()
    })

```

client side error handling

```ts
// client side error handling

const { data, error } = await client.query()

if (error) {
  switch (error.name) {
    case 'nice':
      // gracefull handling
      return { message: error.message }
    default:
      // wildcard handling
      throw error
}

// data is typed as safe now
data
```

## Extensions

If we provide a typesafe data fetching, we should integrate with
schema validation. But all schema validation have its own ecosystem
that make it want to use them.

So we like to provide extensions instead.

Here we need to provide a way to extend the built in system, like
the body parsing.

Server data usually have:

- main request
- body
- session management

### Using Method chaining

> Not Implemented

```ts
const proc = init<{app: boolean}>()
    .store({
        db: dbConnection
    })
    .extend('tbox', (dto, { data, x }) => {
        if (v.Check(dto, data)) {
            return x.input(data)
        }
    })

const auth = proc
    .tbox(t.Object({
        username: t.String(),
        password: t.String(),
    }))
    .mutate(e => {
        // { username: string, password: string }
        e.data
    })
```

### Simple

> Not Implemented

```ts
const proc = init<{app: boolean}>()
    .createEvent(req => ({
        db,
        auth: jwt( adminSession ),
        body: tbox( loginDto )
    }))

const auth = proc
    .mutate(({ input, body, auth }) => {
        const data = body(input)
        const session = auth()
    })
```

problem

- no typesafe if body is parsed inside handler

## Note

consideration

- should we able to define route level middleware ? yes
- should we infer locals from middleware return type ?
- should we create new instance instead when defining procedure ?

todo

- event locals currently hard coded as type

pro

- auto type inference

cons

- no dynamic parameter, yet

terms

- event, is the handle argument that contain all request info
- data, is request body
- state, is request time data, represented as locals in event

maybe

- should one route have multiple method ? no, we must provide 2 input
- should we modify the Procedure instead of creating new Route,  
  and just use typescript to map the object type  
  ! we cant, because no path defined in the procedure


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




