const MuxDemux = require('mux-demux')

const env = require('./environment')
const Base = require('./base')

module.exports = class Module extends Base {
  constructor(options = {}) {
    options.bindReady = false
    super(options)

    if (options.secure === undefined) {
      options.secure = false
    }

    this.authentication = options.authentication

    this.muxes = {}

    this.environment = env(options.environment)
    this.network = this.environment.network
    this.bindReady()
  }

  async bindReady(dependency = () => Promise.resolve()) {
    super.bindReady(() => {
      return new Promise(async resolve => {
        await this.environment.ready()
        await dependency()
        resolve()
      })
    })
  }

  handleReady() {
    super.handleReady()
    this.environment.handleModule(this)
    this.bindConnectionListeners()
    this.bindStreamHandlers()
  }

  bindEventListeners() {
    super.bindEventListeners()
    this.on('mux', mux => this.handleMux(mux))
  }

  bindConnectionListeners() {
    this.network.on('connection', c => this.handleConnection(c))
    this.network.connections.forEach(c => this.handleConnection(c))
  }

  bindStreamHandlers() {}

  handleConnection(connection) {
    if (this.options.secure && !connection.secure) return
    if (connection.incoming) {
      this.debug('incoming connection %s %s', connection.id, connection.peer)
      this.handleIncomingConnection(connection)
    } else if (connection.outgoing) {
      this.debug('outgoing connection %s %s', connection.id, connection.peer)
      this.handleOutgoingConnection(connection)
    }
    connection
      .once('close', () => this.handleConnectionClose(connection))
      .once('error', () => this.handleConnectionError(connection))
  }

  async handleIncomingConnection(connection) {
    if (this.authentication) {
      const session = await new Promise(resolve => {
        const session = this.authentication.sessions[connection.peer]
        if (session) resolve(session)
        else this.authentication.once(`session.${connection.peer}`, resolve)
      })
      const mux = this.createMux(connection)
      const stream = connection.createStream(session.options.id)
      mux.pipe(stream).pipe(mux)
      mux.once('error', () => stream.destroy())
      stream.once('error', () => mux.destroy())
      this.createStreams(mux)
      this.emit('mux', mux)
    } else {
      const mux = this.createMux(connection)
      const stream = connection.createStream(this.streamName)
      mux.pipe(stream).pipe(mux)
      mux.once('error', () => stream.destroy())
      stream.once('error', () => mux.destroy())
      this.createStreams(mux)
      this.emit('mux', mux)
    }
  }

  async handleOutgoingConnection(connection) {
    if (this.authentication) {
      const session = await new Promise(resolve => {
        const session = this.authentication.sessions[connection.peer]
        if (session) resolve(session)
        else this.authentication.once(`session.${connection.peer}`, resolve)
      })
      const stream = connection.streams[session.options.id]
      if (stream) {
        const mux = this.createMux(connection)
        mux.once('error', () => stream.destroy())
        stream.once('error', () => mux.destroy())
        stream.pipe(mux).pipe(stream)
        this.emit('mux', mux)
      } else {
        connection.once(`stream.${session.options.id}`, stream => {
          const mux = this.createMux(connection)
          mux.once('error', () => stream.destroy())
          stream.once('error', () => mux.destroy())
          stream.pipe(mux).pipe(stream)
          this.emit('mux', mux)
        })
      }
    } else {
      connection.once(`stream.${this.streamName}`, stream => {
        const mux = this.createMux(connection)
        mux.once('error', () => stream.destroy())
        stream.once('error', () => mux.destroy())
        stream.pipe(mux).pipe(stream)
        this.emit('mux', mux)
      })
    }
  }

  handleConnectionClose(connection) {
    const mux = this.muxes[connection.id]
    if (!mux) return
    mux.destroy()
    this.muxes[connection.id] = null
  }

  handleConnectionError(connection) {
    this.handleConnectionClose(connection)
  }

  handleMux(mux) {
    this.muxes[mux.connection.id] = mux
  }

  handleStream(stream) {
    this.debug('handling a stream %s %s', stream.meta, stream.id)
    this.emit('stream', stream)
    this.emit(`stream.${stream.meta}`, stream)
  }

  createMux(connection) {
    const mux = new MuxDemux(stream => {
      stream.mux = mux
      this.handleStream(stream)
    })

    mux.connection = connection

    const { createStream } = mux
    mux.createStream = (...args) => {
      const stream = createStream.apply(mux, args)
      this.debug('created a stream %s %s', stream.meta, stream.id)
      stream.mux = mux
      return stream
    }

    return mux
  }

  createStreams() {}

  get discoverable() {
    const { discoverable } = this.options
    return discoverable || discoverable === undefined
  }

  get streamName() {
    return this.options.streamName || this.label
  }
}
