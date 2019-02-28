const crypto = require('crypto')

const RPC = require('./rpc')
const LocalDatabase = require('./local-database')

const Session = require('./session')

const authentication = LocalDatabase('authentication')

module.exports = class Authentication extends RPC {
  constructor(options = {}) {
    options.id = options.code || crypto.randomBytes(8).toString('hex')
    super(options)
    this.sessions = {}
  }

  async bindReady() {
    const { authority, code } = this.options
    if (authority) {
      await authentication.update({ code }, { code }, { upsert: true })
      this.emit('ready')
    } else {
      this.emit('ready')
    }
  }

  createSession(remote) {
    const { code } = this.options
    const hash = crypto.createHash('sha256')
    hash.update(Buffer.from(code, 'hex'))
    hash.update(crypto.randomBytes(8))
    const id = hash.digest().toString('hex')
    const peer = remote.$nodeId
    const algorithm = 'aes256'
    const key = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)
    const session = new Session({ id, peer, algorithm, key, iv })
    this.sessions[peer] = peer
    this.emit(`session.${peer}`, session)
    return session
  }

  async handleRemote(remote) {
    const { authority, code } = this.options
    if (!authority) {
      const options = await remote.authenticate(code)
      if (options) {
        options.peer = remote.$nodeId
        options.key = Buffer.from(options.key, 'hex')
        options.iv = Buffer.from(options.iv, 'hex')
        const session = new Session(options)
        this.sessions[options.peer] = options.peer
        this.emit(`session.${options.peer}`, session)
      }
    }
  }

  getProtocol(methods = {}) {
    const self = this
    return super.getProtocol(
      Object.assign(methods, {
        async authenticate(code) {
          const exists = await authentication.count({ code })
          if (!exists) return
          const session = self.createSession(this.remote)
          const { id, algorithm, key, iv } = session.options
          return {
            id,
            algorithm,
            key: key.toString('hex'),
            iv: iv.toString('hex'),
          }
        },
      }),
    )
  }
}
