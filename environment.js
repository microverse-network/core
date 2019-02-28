const config = require('./config')
const Base = require('./base')
const Network = require('./network')

class Environment extends Base {
  constructor(options = {}) {
    super(options)

    this.network = this.createNetwork()
    this.network.ready().then(() => this.emit('ready'))

    this.modulesByLabel = {}
  }

  handleModule(module) {
    this.addModuleToLabelMap(module)
    this.emit('module', module)
    this.emit(`module.${module.name}`, module)
  }

  addModuleToLabelMap(module) {
    let list = this.modulesByLabel[module.label]
    if (list) {
      list.push(module)
    } else {
      this.modulesByLabel[module.label] = [module]
    }
  }

  handleReady() {
    super.handleReady()
    this.loadPlugins()
  }

  createNetwork() {
    const { transport } = config.network
    return new Network({ transport })
  }

  loadPlugins() {
    const options = {}
    config.plugins.forEach(PluginConstructor => new PluginConstructor(options))
  }
}

let env = null

module.exports = (options = {}) => {
  if (env) {
    return env
  }

  const Constructor = options.Constructor || Environment
  env = new Constructor(options)
  return env
}

module.exports.Environment = Environment
