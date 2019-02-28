const debug = require('debug')
const EventEmitter = require('eventemitter3')

module.exports = class Base extends EventEmitter {
  constructor(options = {}) {
    super()
    this.options = options
    this.id = options.id
    this._ready = new Promise(resolve => this.once('ready', resolve))
    this._debug = debug(`microverse/${this.label}`)
    this.debug('instantiated')
    if (options.bindReady === undefined) this.bindReady()
  }

  debug(...args) {
    this._debug(...args)
  }

  ready() {
    return this._ready
  }

  async bindReady(dependency = () => Promise.resolve()) {
    await dependency()
    this.handleReady()
    this.emit('ready')
  }

  handleReady() {
    this.debug('ready')
    this.bindEventListeners()
  }

  bindEventListeners() {}

  get label() {
    const name = this.options.name || this.constructor.name
    if (this.id) return `${name}{id:${this.id}}`
    return name
  }
}
