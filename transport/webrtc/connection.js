const TransportConnection = require('../connection')

module.exports = class WebRTCConnection extends TransportConnection {
  constructor(upstream, options) {
    options.id = options.id || upstream._id
    options.type = 'webrtc'
    super(upstream, options)
  }

  getUpstreamStream() {
    return this.upstream
  }

  bindUpstreamListeners() {
    super.bindUpstreamListeners()
    this.upstream
      .on('connect', () => this.emit('open'))
      .on('close', () => this.emit('close'))
      .on('error', err => this.handleError(err))
  }

  close() {
    super.close()
    this.upstream.destroy()
  }
}
