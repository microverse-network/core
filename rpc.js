const dnode = require('dnode')
const dnodep = require('dnode-promise')

const Module = require('./module')

module.exports = class RPC extends Module {
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
    this.remotes.add(remote)
    this.remotesById.set(remote.$nodeId, remote)
    setTimeout(() => remote.$ping(), 1000)
  }

  createStreams(mux) {
    super.createStreams()
    this.bindDnodeStream(mux.createStream('dnode'))
  }

  bindStreamHandlers() {
    super.bindStreamHandlers()
    this.on('stream.dnode', stream => this.bindDnodeStream(stream))
  }

  bindDnodeStream(stream) {
    const remoteApi = this.getProtocol()
    const d = dnode(dnodep.toDnode(remoteApi), { weak: false })
    stream.pipe(d).pipe(stream)
    d.on('remote', async methods => {
      const remote = dnodep.toPromise(methods)
      remote.$stream = stream
      Object.assign(remote, await remote.$properties())
      remoteApi.remote = remote
      this.debug('remote %s on %s', remote.$label, remote.$nodeId)
      this.emit('remote', remote)
      this.emit(`remote.${remote.$nodeId}`, remote)
    })
  }

  get nextRemote() {
    let { value, done } = this.remoteIterator.next()
    if (!done) return value
    this.remoteIterator = this.remotes.values()
    return this.remoteIterator.next().value
  }

  getProtocol(methods = {}) {
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
      $ping(timeout = 1) {
        setTimeout(() => {
          this.remote.$ping(timeout)
        }, timeout * 1000)
      },
    })
  }
}
