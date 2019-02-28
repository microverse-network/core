const config = require('./config')
config.plugins = config.plugins.concat([
  // require('../key-exchange'),
  require('./tracker'),
  require('./webrtcnegotiator'),
])
