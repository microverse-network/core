const crypto = require('crypto')

const LocalDatabase = require('./local-database')

const db = LocalDatabase('identity')

const init = async () => {
  const identities = await db.find({})
  if (!identities.length) {
    const { publicKey, privateKey } = generate()
    const publicKeyHash = getKeyHash(publicKey)
    const privateKeyHash = getKeyHash(privateKey)
    await db.insert({
      publicKey,
      publicKeyHash,
      privateKey,
      privateKeyHash,
    })
  }
}

const getKeyHash = key => {
  const hash = crypto.createHash('sha256')
  hash.update(key)
  return hash.digest().toString('hex')
}

const generate = () => {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
}

module.exports = async () => {
  await init()
  return (await db.find({}))[0]
}
