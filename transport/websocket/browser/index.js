const _ = require('lodash')
const shortid = require('shortid')

const Transport = require('../index')
const Connection = require('./connection')

module.exports = class WebSocket extends Transport {
  constructor(id, options = {}) {
    super(id, options)
    _.defer(() => this.emit('open'))
  }

  connect(node, options = {}) {
    if (!options.id) {
      options.id = shortid.generate()
    }
    options.peer = this.id
    const nodeUrl = new URL(`ws://${node.transport.websocket.url}`)
    nodeUrl.search = new URLSearchParams(options)

    options.origin = this.id
    options.peer = node.id
    return new Connection(new WebSocket(nodeUrl.href), options)
  }
}
