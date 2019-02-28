const Connection = require('../connection')

module.exports = class WebSocketConnection extends Connection {
  bindUpstreamListeners() {
    this.upstream.addEventListener('open', () => this.emit('open'))
    this.upstream.addEventListener('close', () => this.emit('close'))
    this.upstream.addEventListener('error', err => this.handleError(err))
  }
}
