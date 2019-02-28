const crypto = require('crypto')

const RPC = require('./rpc')
const LocalDatabase = require('./local-database')

const getIdentity = require('./identity')

const publicKeys = LocalDatabase('public_keys')

module.exports = class KeyExchange extends RPC {
  constructor(options = {}) {
    options.secure = false
    super(options)
    this.encryption = this.network.transport.encryption = {}
  }

  async handleReady() {
    super.handleReady()
    this.identity = await getIdentity()
  }

  async handleRemote(remote) {
    super.handleRemote(remote)
    const { connection } = remote.$stream.mux
    if (this.encryption[remote.$nodeId]) return

    const nodeId = remote.$nodeId
    const publicKey = await remote.publicKey()
    await publicKeys.update({ publicKey }, { publicKey }, { upsert: true })

    if (connection.incoming) return

    const algorithm = 'aes256'
    const key = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)
    this.encryption[nodeId] = createEncryptionKey(algorithm, key, iv)
    if (nodeId !== connection.peer) {
      this.encryption[connection.peer] = this.encryption[nodeId]
    }

    const args = [algorithm, key.toString('hex'), iv.toString('hex')]
    const buffer = Buffer.from(JSON.stringify(args))
    const encrypted = crypto.publicEncrypt(publicKey, buffer).toString('hex')

    await remote.exchange(encrypted)
    connection
      .once('close', () => {
        connection.options.id = null
        this.network.connect(...connection.args)
      })
      .close()
  }

  getProtocol(methods = {}) {
    const self = this
    return super.getProtocol({
      async publicKey() {
        return (await getIdentity()).publicKey
      },
      async exchange(encrypted) {
        const buffer = Buffer.from(encrypted, 'hex')
        const { privateKey } = await getIdentity()
        const decrypted = crypto.privateDecrypt(privateKey, buffer)
        const args = JSON.parse(decrypted.toString())
        const algorithm = args[0]
        const key = Buffer.from(args[1], 'hex')
        const iv = Buffer.from(args[2], 'hex')
        const nodeId = this.remote.$nodeId
        self.encryption[nodeId] = createEncryptionKey(algorithm, key, iv)
      },
    })
  }
}

const createEncryptionKey = (algorithm, key, iv) => {
  return {
    get cipher() {
      return crypto.createCipheriv(algorithm, key, iv)
    },
    get decipher() {
      return crypto.createDecipheriv(algorithm, key, iv)
    },
  }
}
