const ws = require('ws')
const shortid = require('shortid')
const { URL, URLSearchParams } = require('url')

const Transport = require('../index')
const Connection = require('./connection')

module.exports = class WebSocket extends Transport {
  constructor(options = {}) {
    super(options)
    this.url = options.url || 'http://localhost'
    if (options.port || options.server) {
      this.server = new ws.Server(options)
        .on('connection', (ws, req) => this.handleConnection(ws, req))
        .on('error', err => this.handleError(err))
    }
    process.nextTick(() => this.emit('open'))
  }

  connect(node, options = {}) {
    options.id = shortid.generate()
    if (!node.transport.websocket) {
      throw new Error('node does not support WebSocket transport')
    }
    if (!node.transport.websocket.url) {
      throw new Error('node is missing proper WebSocket URL')
    }
    options.peer = this.id
    const nodeUrl = new URL(`ws://${node.transport.websocket.url}`)
    nodeUrl.search = new URLSearchParams(options)
    options.origin = this.id
    options.peer = node.id
    if (this.encryption && this.encryption[node.id]) {
      options.cipher = this.encryption[node.id].cipher
      options.decipher = this.encryption[node.id].decipher
    }
    const connection = new Connection(new ws(nodeUrl.href), options)
    connection.args = [node, options]
    return connection
  }

  handleConnection(ws, req) {
    const params = new URL(req.url, `ws://${this.url}`).searchParams
    const options = {}
    for (const [name, value] of params) {
      options[name] = value
    }
    options.origin = options.peer
    if (this.encryption && this.encryption[options.peer]) {
      options.cipher = this.encryption[options.peer].cipher
      options.decipher = this.encryption[options.peer].decipher
    }
    this.emit('connection', new Connection(ws, options))
  }

  handleError(err) {
    this.debug('error %s', err)
    this.emit('error', err)
  }
}
