

import { initRouter, procedure } from "./rpc.server"
import { unwrap, Client } from "./rpc.client"

const proc = procedure<{app: boolean}>()
  .use(e => e.locals = { app: false })

// GET/login?username=string&password=string
const auth = {
  login: proc
    .input(e => (e as { username: string, password: string }))
    .use<{ mob: string }>(e => e.locals.mob = 'mob')
    .query(e => {
      return Promise.resolve({ mong: e.data.username + e.locals.mob })
    }),
}

const router = initRouter(auth)





// client

let client = Client<typeof auth>("http://localhost:3000")

const { data, error } = await client.login.query({ username: '&inject=true', password: 'nice' },{
  mode: 'cors',
  credentials: 'include'
})


if (error) {
  switch (error.name) {
    default:
      throw 'nain'
  }
}

data.mong





