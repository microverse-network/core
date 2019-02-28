const Base = require('../base')

module.exports = class Transport extends Base {
  constructor(options = {}) {
    super(options)
  }

  connect() {
    throw new Error('not implemented')
  }

  handleConnection() {
    throw new Error('not implemented')
  }
}
