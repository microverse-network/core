const path = require('path')

const NeDB = require('nedb-promises')

const paths = require('env-paths')('microverse', { suffix: '' })
const defaultDataPath = paths.data

const instances = {}

module.exports = (name, dataPath = defaultDataPath) => {
  dataPath = process.env.MICROVERSE_DATA_PATH || dataPath
  const filename = path.join(dataPath, `${name}.db`)
  if (instances[filename]) return instances[filename]
  const autoload = true
  const timestampData = true
  return (instances[filename] = new NeDB({ autoload, filename, timestampData }))
}
