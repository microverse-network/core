const config = require('./config')

config.network = {
  transport: {
    constructor: require('./transport/multi'),
    options: {
      subtransports: {
        webrtc: {
          constructor: require('./transport/wrtc'),
          options: {},
        },
        websocket: {
          constructor: require('./transport/websocket'),
          options: {},
        },
      },
    },
  },
}
