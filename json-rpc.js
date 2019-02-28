const RPC = require('json-rpc-core')

const Module = require('./module')

module.exports = class JSONRPC extends Module {
  constructor(options = {}) {
    super(options)
    this.remotes = new Set()
    this.remotesById = new Map()
    this.remoteIterator = this.remotes.values()
  }

  bindEventListeners() {
    super.bindEventListeners()
    this.on('remote', (...args) => this.handleRemote(...args))
  }

  handleConnectionClose(connection) {
    super.handleConnectionClose(connection)
    const remote = this.remotesById.get(connection.peer)
    this.remotes.delete(remote)
    this.remotesById.delete(connection.peer)
  }

  handleRemote(remote) {
    this.debug('remote %s on %s', remote.$label, remote.$nodeId)
    this.remotes.add(remote)
    this.remotesById.set(remote.$nodeId, remote)
    setTimeout(() => remote.$ping(), 1000)
  }

  createStreams(mux) {
    super.createStreams()
    this.bindClientStream(mux.createStream('jsonrpc'))
  }

  bindStreamHandlers() {
    super.bindStreamHandlers()
    this.on('stream.jsonrpc', stream => this.bindServerStream(stream))
  }

  async bindClientStream(stream) {
    const methods = this.getMethods()
    const client = new RPC(methods)
    stream.pipe(client).pipe(stream)
    client.$stream = stream
    const remote = client.createRemoteCalls(await client.discover())
    methods.remote = remote
    Object.assign(remote, await remote.$properties())
    this.emit('remote', remote)
  }

  async bindServerStream(stream) {
    const methods = this.getMethods()
    const server = new RPC(methods)
    stream.pipe(server).pipe(stream)
    await server.discover()
    const remote = server.createRemoteCalls(await server.discover())
    methods.remote = remote
    Object.assign(remote, await remote.$properties())
    this.emit('remote', remote)
  }

  get nextRemote() {
    let { value, done } = this.remoteIterator.next()
    if (!done) return value
    this.remoteIterator = this.remotes.values()
    return this.remoteIterator.next().value
  }

  getMethods(methods = {}) {
    const self = this
    return Object.assign(methods, {
      $properties() {
        const { label } = self
        const { id } = self.network
        return {
          $label: label,
          $nodeId: id,
        }
      },
      $ping(timeout = 90) {
        const { $label, $nodeId } = this.remote
        self.debug('ping from %s on %s', $label, $nodeId)
        setTimeout(() => this.remote.$ping(timeout), timeout * 1000)
      },
    })
  }
}
