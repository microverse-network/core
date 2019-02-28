let config = null

if (process && process.env && process.env.MICROVERSE_CONFIG) {
  config = process.env.MICROVERSE_CONFIG
} else if (global['_microverse_config_']) {
  config = global['_microverse_config_']
} else {
  try {
    config = require(`${process.cwd()}/microverse.json`)
  } catch (e) {
    config = {}
  }
}

if (!config.plugins) {
  config.plugins = []
}

module.exports = global.MICROVERSE_CONFIG = config
