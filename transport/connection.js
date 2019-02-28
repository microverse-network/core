const MuxDemux = require('mux-demux')

const Base = require('../base')

module.exports = class TransportConnection extends Base {
  constructor(upstream, options = {}) {
    super(options)
    this.id = options.id
    this.type = options.type || 'generic'
    this.origin = options.origin
    this.peer = options.peer
    this.upstream = upstream
    this.cipher = options.cipher
    this.decipher = options.decipher

    this.streams = {}

    this.bindUpstreamListeners()
    this.wrap()
  }

  bindEventListeners() {
    super.bindEventListeners()
    if (this.secure) {
      this.cipher.on('error', err => {
        this.debug('cipher error %o', err)
        this.cipher.destroy()
        this.wrapper.destroy()
        this.close()
      })
      this.decipher.on('error', err => {
        this.debug('decipher error %o', err)
        this.decipher.destroy()
        this.wrapper.destroy()
        this.close()
      })
    }
    this.once('close', (...args) => this.handleClose(...args))
  }

  wrap() {
    const upstream = this.getUpstreamStream()
    const wrapper = new MuxDemux()
    if (this.secure) {
      wrapper
        .pipe(this.cipher)
        .pipe(upstream)
        .pipe(this.decipher)
        .pipe(wrapper)
    } else {
      wrapper.pipe(upstream).pipe(wrapper)
    }
    wrapper.on('connection', stream => this.handleStream(stream.meta, stream))
    this.wrapper = wrapper
  }

  getUpstreamStream() {
    throw new Error('not implemented')
  }

  bindUpstreamListeners() {}

  createStream(name, options) {
    const stream = this._createStream(name, options)
    this.debug('created a stream %s', name)
    return stream
  }

  handleStream(name, stream) {
    this.debug('received a stream %s', name)
    this.streams[name] = stream
    this.emit('stream', name, stream)
    this.emit(`stream.${name}`, stream)
  }

  _createStream(name) {
    if (this.wrapper) {
      const stream = this.wrapper.createStream(name)
      this.debug('created a substream %s %s', stream.meta, stream.id)
      return stream
    }

    throw new Error('not implemented')
  }

  close() {
    this.debug('close')
    this.wrapper.destroy()
  }

  handleClose() {
    this.debug('closed')
    this.wrapper.destroy()
  }

  handleError(err) {
    this.debug('error %o', err)
    this.close()
  }

  get incoming() {
    return this.origin === this.peer
  }

  get outgoing() {
    return this.origin !== this.peer
  }

  get secure() {
    return this.cipher && this.decipher && true
  }
}
