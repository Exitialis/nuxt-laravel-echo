const path = require('path')

module.exports = function LaravelEchoSockets (moduleOptions) {
  const defaultConfigs = {
    host: 'https://localhost:3001',
    auth: {}
  }

  const options = Object.assign(defaultConfigs, this.options.laravelEchoSockets, moduleOptions)

  this.addPlugin({
    src: path.resolve(__dirname, '../templates/plugin.js'),
    ssr: false,
    fileName: 'sockets.js',
    options
  })
}

// REQUIRED if publishing as an NPM package
module.exports.meta = require('../package.json')
