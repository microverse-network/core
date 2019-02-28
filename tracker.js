const RPC = require('./rpc')

module.exports = class Tracker extends RPC {
  constructor(options = {}) {
    options.discoverable = false
    super(options)
  }

  bindEventListeners() {
    super.bindEventListeners()
    this.environment.on('module', module => this.handleModule(module))
  }

  handleReady() {
    super.handleReady()
    this.network.connect({
      id: 'tracker',
      transport: {
        accepts: ['websocket'],
        websocket: { url: 'tracker' },
      },
    })
  }

  async handleModule(module) {
    const description = this.getDescription(module)
    if (module.discoverable) {
      this.remotes.forEach(tracker => tracker.add(description))
    }
    this.remotes.forEach(tracker => this.discover(description, tracker))
  }

  handleRemote(tracker) {
    super.handleRemote(tracker)
    const { modulesByLabel } = this.environment
    Object.keys(modulesByLabel).forEach(label => {
      modulesByLabel[label].forEach(module => {
        const description = this.getDescription(module)
        if (module.discoverable) tracker.add(description)
        this.discover(description, tracker)
      })
    })
  }

  handleIncomingConnection() {}

  handleOutgoingConnection(connection) {
    if (connection.peer !== 'tracker') return
    super.handleOutgoingConnection(connection)
  }

  getDescription(module) {
    return {
      node: this.getNodeDescription(),
      module: this.getModuleDescription(module),
    }
  }

  getNodeDescription() {
    const { id } = this.network
    const { accepts } = this.network.transport
    const transport = { accepts }
    return { id, transport }
  }

  getModuleDescription(module) {
    const label = module.label
    const streamName = module.streamName
    return { label, streamName }
  }

  async discover(query, tracker) {
    const { streamName } = query.module
    const selector = { 'module.streamName': streamName }
    const available = await tracker.query(selector)
    available.forEach(description => {
      if (description.node.id === this.network.id) return
      this.network.connect(description.node)
    })
  }

  offer(description) {
    const { node } = description
    setTimeout(() => {
      this.network.connect(node)
    }, 10 * 1000)
  }

  getProtocol(methods = {}) {
    methods.offer = (...args) => this.offer(...args)
    return super.getProtocol(methods)
  }
}
