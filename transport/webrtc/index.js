const Peer = require('simple-peer')

const Transport = require('../index')
const Connection = require('./connection')

module.exports = class WebRTC extends Transport {
  constructor(id, options = {}) {
    super(id, options)
    this.connections = new Map()
    setTimeout(() => this.emit('open'), 1000)
  }

  connect(node, options = {}) {
    options.initiator = true
    options.origin = this.id
    options.peer = node.id
    if (this.encryption && this.encryption[node.id]) {
      options.cipher = this.encryption[node.id].cipher
      options.decipher = this.encryption[node.id].decipher
    }
    const connection = new Connection(this.getUpstream(options), options)
    connection.args = [node, options]
    this.connections.set(connection.id, connection)
    connection.upstream.once('signal', data => {
      this.emit('signal', data, connection)
    })
    return connection
  }

  handle(signal) {
    let connection = this.connections.get(signal.id)
    if (!connection) {
      const options = {
        id: signal.id,
        initiator: false,
        origin: signal.origin,
        peer: signal.origin,
      }
      if (this.encryption && this.encryption[signal.origin]) {
        options.cipher = this.encryption[signal.origin].cipher
        options.decipher = this.encryption[signal.origin].decipher
      }
      connection = new Connection(this.getUpstream(options), options)
      connection.upstream.on('signal', data => {
        this.emit('signal', data, connection)
      })
      this.connections.set(connection.id, connection)
      this.emit('connection', connection)
    }

    if (!connection.upstream.destroyed) {
      connection.upstream.signal(signal.data)
    }
  }

  getUpstream(options = {}) {
    return new Peer(options)
  }
}
