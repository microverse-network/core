const WebSocketConnectionStream = require('websocket-connection-stream')

const TransportConnection = require('../connection')

module.exports = class WebSocketConnection extends TransportConnection {
  constructor(ws, options) {
    options.type = 'websocket'
    super(ws, options)
  }

  getUpstreamStream() {
    return new WebSocketConnectionStream().attach(this.upstream)
  }

  bindUpstreamListeners() {
    super.bindUpstreamListeners()
    this.upstream
      .once('open', () => this.emit('open'))
      .once('close', () => this.emit('close'))
      .on('error', err => this.handleError(err))
  }

  close() {
    super.close()
    this.upstream.close()
  }

  handleError(err) {
    this.debug('error %s', err)
    this.emit('error', err)
  }
}
