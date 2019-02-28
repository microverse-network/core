const async = require('async')

const Base = require('../base')

module.exports = class MultiTransport extends Base {
  constructor(options = {}) {
    super(options)
    this.transports = []
    const { subtransports } = options
    Object.keys(subtransports).forEach(name => {
      const transportOptions = subtransports[name]
      const transport = this.createSubtransport(transportOptions)
      this[name] = transport
      this.transports.push(transport)
      this.bindSubtransportListeners(transport)
    })
    async.parallel(
      this.transports.map(transport => callback => {
        transport.once('open', callback)
      }),
      () => this.emit('open'),
    )
  }

  set encryption(encryption) {
    this.transports.forEach(t => (t.encryption = encryption))
  }

  get accepts() {
    return Object.keys(this.options.subtransports)
  }

  createSubtransport({ constructor, options = {} }) {
    options.id = this.id
    return new constructor(options)
  }

  bindSubtransportListeners(transport) {
    transport.on('connection', connection => {
      this.emit('connection', connection)
    })
  }

  connect(node, options) {
    const available = node.transport.accepts
    for (let i = 0; i <= available.length; i++) {
      const transport = this[available[i]]
      if (transport) {
        return transport.connect(node, options)
      }
    }
    throw new Error(`could not find a transport for node ${node.id}`)
  }
}
