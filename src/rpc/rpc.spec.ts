

import { initRouter, procedure } from "./rpc.server"
import { unwrap, Client } from "./rpc.client"

const proc = procedure<{app: boolean}>()
  .use(e => e.locals = { app: false })

// GET/login?username=string&password=string
const auth = {
  login: proc
    .input(e => (e as { username: string, password: string }))
    .error<{ name: 'nice', message: 'nia' }>()
    .query(e => {
      if (!e.locals) {
        throw e.error({ name: 'nice', message: 'nia' })
      }
      return Promise.resolve({ mong: e.data.username })
    })
}

const router = initRouter(auth)

const server = Bun.serve({
  fetch(request, server) {
    return router(request)
  },
})




// client

let client = Client<typeof auth>("http://localhost:3000")

const { data, error } = await client.login.query({ username: '&inject=true', password: 'nice' },{
  mode: 'cors',
  credentials: 'include'
})

console.log({data, error})

server.stop()





