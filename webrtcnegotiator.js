const RPC = require('./rpc')

module.exports = class WebRTCNegotiator extends RPC {
  constructor(options = {}) {
    options.discoverable = false
    super(options)
  }

  handleReady() {
    super.handleReady()
    this.transport = this.network.transport.webrtc
    this.transport.on('signal', (...args) => this.dispatch(...args))
  }

  dispatch(data, connection) {
    const id = connection.id
    const origin = this.network.id
    const receiver = connection.peer
    const signal = { id, origin, receiver, data }
    this.debug('dispatch %s', signal.id)
    this.remotes.forEach(negotiator => negotiator.dispatch(signal))
  }

  receive(signal) {
    this.debug('received a signal %s', signal.id)
    this.transport.handle(signal)
  }

  handleIncomingConnection() {}

  handleOutgoingConnection(connection) {
    if (connection.peer !== 'tracker') return
    super.handleOutgoingConnection(connection)
  }

  getProtocol(methods = {}) {
    methods.receive = (...args) => this.receive(...args)
    return super.getProtocol(methods)
  }
}
