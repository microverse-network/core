const crypto = require('crypto')
const stream = require('stream')

const Base = require('./base')
const LocalDatabase = require('./local-database')

const sessions = LocalDatabase('sessions')

module.exports = class Session extends Base {
  constructor(options = {}) {
    super(options)
    const { algorithm, key, iv } = this.options
    if (algorithm && key && iv) {
      this.save()
    } else {
      this.load()
    }
  }

  async load() {
    const { code } = this.options
    const { algorithm, key, iv } = await sessions.findOne({ code })
    Object.assign(this.options, { algorithm, key, iv })
    this.createEncryptionKey()
  }

  save() {
    const { code, algorithm, key, iv } = this.options
    sessions.insert({
      code,
      algorithm,
      key: key.toString('hex'),
      iv: iv.toString('hex'),
    })
    this.createEncryptionKey()
  }

  pipeline(mux, upstream) {
    const { cipher, decipher } = this.encryption
    mux
      .pipe(cipher)
      .pipe(
        new stream.Transform({
          objectMode: true,
          transform(chunk, encoding, callback) {
            callback(null, Buffer.from(chunk, encoding))
          },
        }),
      )
      .pipe(upstream)
      .pipe(
        new stream.Transform({
          objectMode: true,
          transform(chunk, encoding, callback) {
            callback(null, Buffer.from(chunk, encoding))
          },
        }),
      )
      .pipe(decipher)
      .pipe(mux)
  }

  createEncryptionKey() {
    const { algorithm, key, iv } = this.options
    this.encryption = {
      get cipher() {
        return crypto.createCipheriv(algorithm, key, iv)
      },
      get decipher() {
        return crypto.createDecipheriv(algorithm, key, iv)
      },
    }
  }
}
