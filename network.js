const _ = require('lodash')
const shortid = require('shortid')
const Base = require('./base')

module.exports = class Network extends Base {
  constructor(options = {}) {
    options.id = shortid.generate()
    super(options)
    this.connections = []

    this.createTransport()
    this.bindTransportListeners()
  }

  createTransport() {
    const { constructor, options } = this.options.transport
    options.id = this.id
    this.transport = new constructor(options)
  }

  bindTransportListeners() {
    this.transport.once('open', () => this.handleTransportOpen())
    this.transport.on('error', e => this.handleTransportError(e))
    this.transport.on('connection', c => this.handleConnection(c))
  }

  handleTransportOpen() {
    this.emit('ready')
    if (this.transport.webrtc) {
      this.handleSubtransport(this.transport.webrtc, 'webrtc')
    }
  }

  handleTransportError(err) {
    this.debug('transport error %s', err)
  }

  handleSubtransport(transport, type) {
    this.emit('transport', transport, type)
    this.emit(`transport.${type}`, transport)
  }

  connect(node, options) {
    if (node.id === this.id) {
      this.debug('cannot connect to self')
      return null
    }

    let connections = this.connections.filter(c => node.id === c.peer)

    if (connections.length) {
      this.debug('already connected to %s', node.id)
      return
    }

    this.debug('connect %s', node.id)
    try {
      const connection = this._connect(node, options)
      this.handleConnection(connection)
      return connection
    } catch (e) {
      console.error(e)
      return null
    }
  }

  _connect(node, options) {
    return this.transport.connect(node, options)
  }

  destroy() {
    this.debug('destroy')
    this.destroyed = true
    this.transport.destroy()
    this.emit('destroy')
  }

  handleConnection(connection) {
    this.debug('handling a connection %s', connection.id)
    this.connections.push(connection)
    connection
      .once('close', () => this.handleConnectionClose(connection))
      .on('error', err => this.handleConnectionError(connection, err))
    this.emit('connection', connection)
  }

  handleConnectionClose(connection) {
    _.remove(this.connections, c => c.id === connection.id)
  }

  handleConnectionError(connection, err) {
    this.debug('connection error %s', err)
  }
}
