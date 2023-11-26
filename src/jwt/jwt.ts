import { createHmac } from "crypto"

declare global {
  namespace JWT {
    interface Payload {
      iss?: string
      aud?: string
      sub?: number
      iat?: number
      exp?: number
    }
    interface Header {
      typ: "JWT"
      alg: keyof typeof supportedAlgs
      kid?: number
    }
  }
}

const supportedAlgs = {
  "HS256": "sha256"
} as const

/**
  * JWT Implementation
  * - signature using sha256
  * - automatic key rotation
  */
export class Jwt<Payload extends Record<string,any> = {}> {
  secrets: string[]
  header = {
    alg: "HS256" as keyof typeof supportedAlgs,
    typ: "JWT",
    kid: 0
  } satisfies JWT.Header

  payload: JWT.Payload = {}
  expirationTime: `${number}h` | `${number}d` = '7d'

  iss: string | undefined = undefined
  aud: string | undefined = undefined
  iat: string | undefined = undefined

  private encodedHeader = ''

  /** if string array is provided, the last key will be prioritized for signing */
  constructor(secret: string | string[]) {
    this.secrets = typeof secret === 'string' ? [secret] : secret
    this.header.kid = this.secrets.length - 1
    this.encodeHeader()
  }

  private encodeHeader() {
    this.encodedHeader = Buffer.from(JSON.stringify(this.header))
      .toString("base64")
      .replace(/=/g,'')
      .replace(/\+/g,'-')
      .replace(/\//,'_')
  }

  /** 1h: 1 hour, 7d: 7 days */
  setExpirationTime(time: `${number}h` | `${number}d`) {
    this.expirationTime = time
  }

  /** this secret will be used in the next signing */
  addSecret(secret: string) {
    this.secrets.push(secret)
    this.header.kid += 1
  }

  static relTimeToNumber(time: `${number}h` | `${number}d`) {
    if (time.endsWith('h')) {
      const hour = parseInt(time.replace('h',''))
      const date = new Date()
      date.setHours(date.getHours() + hour)
      return parseInt(String(date.valueOf()).slice(0,-3))
    }

    if (time.endsWith('d')) {
      const day = parseInt(time.replace('d',''))
      const date = new Date()
      date.setDate(date.getDate() + day)
      return parseInt(String(date.valueOf()).slice(0,-3))
    }

    return 0
  }

  sign(payload: JWT.Payload & Payload) {
    // Object.assign is deep copy, why internet says shallow copy
    const newPayload = Object.assign({}, this.payload, payload)

    newPayload.iat ??= parseInt(String(Date.now()).slice(0,-3))
    newPayload.exp ??= Jwt.relTimeToNumber(this.expirationTime)
    // parseInt(String(Date.now()).slice(0,-3)) + this.expirationTime

    const encodedPayload = Buffer.from(JSON.stringify(newPayload))
      .toString("base64")
      .replace(/=/g,'')
      .replace(/\+/g,'-')
      .replace(/\//,'_')

    const signature = createHmac(supportedAlgs[this.header.alg], this.secrets.at(-1)!)
      .update(`${this.encodedHeader}.${encodedPayload}`)
      .digest("base64")

    return `${this.encodedHeader}.${encodedPayload}.${signature}`
  }

  // TODO: expiration check
  verify(token: string) {
    try {
      if (!token.includes('.') || token.split(".").length !== 3) {
        throw void 0
      }

      const [encodedHeader, encodedPayload, signature] = token.split(".")

      const header = JSON.parse(
        Buffer.from(encodedHeader
            .replace(/-/g,'+')
            .replace(/_/g,'/'),
          "base64")
        .toString()
      ) as JWT.Header

      const secret = this.secrets[header.kid ?? 0]

      const payload: Payload & JWT.Payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString())

      const alg = supportedAlgs[header.alg]

      const expectedSignature = createHmac(alg, secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64")

      if (signature !== expectedSignature) {
        throw void 0
      }

      return { payload, header }
    } catch (e) {
      throw new Error("Unauthorized")
    }
  }

  // .setProtectedHeader({ alg })
  // .setIssuer('urn:example:issuer')
  // .setAudience('urn:example:audience')
}

