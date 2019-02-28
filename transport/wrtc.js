const wrtc = require('wrtc')

const WebRTC = require('./webrtc')

module.exports = class NodeWebRTC extends WebRTC {
  getUpstream(options = {}) {
    options.wrtc = wrtc
    return super.getUpstream(options)
  }
}
