const config = require('./config')

config.network = {
  transport: {
    constructor: require('./transport/multi'),
    options: {
      subtransports: {
        webrtc: {
          constructor: require('./transport/webrtc'),
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
