import Echo from 'laravel-echo'
import Vue from 'vue'
import io from 'socket.io-client'

window.io = io

let Socket = {
  install (Vue, observer) {

    Vue.prototype.$echo = observer

    Vue.mixin({
      beforeMount () {
        if (this.$options['socket']) {
          let conf = this.$options.socket

          if (conf.private) {
            this.$echo.registerListeners(conf, 'private', this)
          }
          if (conf.presence) {
            Object.keys(conf.presence).forEach((channelName) => {
              let hereCallback = () => {}
              let joiningCallback = () => {}
              let leavingCallback = () => {}
              if (conf.presence[channelName].here) {
                hereCallback = conf.presence[channelName].here.bind(this)
              }
              if (conf.presence[channelName].joining) {
                joiningCallback = conf.presence[channelName].joining.bind(this)
              }
              if (conf.presence[channelName].leaving) {
                leavingCallback = conf.presence[channelName].leaving.bind(this)
              }
              this.$echo.join(channelName).here(hereCallback).joining(joiningCallback).leaving(leavingCallback)
            })
            this.$echo.registerListeners(conf, 'presence', this)
          }
          if (conf.public) {
            this.$echo.registerListeners(conf, 'public', this)
          }
        }
      },
      beforeDestroy () {
        this.$echo.leaveFromChannels()
      }
    })
  }
}

class Observer {
  constructor (echo, store) {
    this.publicChannels = new Map()
    this.privateChannels = new Map()
    this.presenceChannels = new Map()
    this._echo = echo
    this.patterns = {}
    this._store = store

    <% if (options.patterns) { %>
      this.registerPatterns()
    <% } %>
  }

  channel (name) {
    if (this.publicChannels.has(name)) {
      return this.publicChannels.get(name)
    }
    let channel = this._echo.channel(name)
    this.publicChannels.set(name, channel)
    return channel
  }

  public (name) {
    return this.channel(name)
  }

  private (name) {
    if (this.privateChannels.has(name)) {
      return this.privateChannels.get(name)
    }
    let channel = this._echo.private(name)
    this.privateChannels.set(name, channel)
    return channel
  }

  join (name) {
    if (this.presenceChannels.has(name)) {
      return this.presenceChannels.get(name)
    }
    let channel = this._echo.join(name)
    this.presenceChannels.set(name, channel)
    return channel
  }

  presence (name) {
    return this.join(name)
  }

  registerListeners (conf, type, ctx) {
    Object.keys(conf[type]).forEach((channelName) => {
      Object.keys(conf[type][channelName]).forEach((eventName) => {
        let callback = conf[type][channelName][eventName].bind(ctx)
        this.registerListener(type, channelName, eventName, callback)
      })
    })
  }

  registerListener (type, channelName, eventName, callback) {
    <% if (options.patterns) { %>
      channelName = this.replacePatterns(channelName)
    <% } %>
    this[type](channelName).listen(eventName, callback)
  }

  replacePatterns (channelName) {
    Object.keys(this.patterns).forEach(pattern => {
      if (channelName.includes(pattern)) {
        let replacement = this.patterns[pattern](this._store)
        if (replacement) {
          channelName = channelName.replace(pattern, replacement)
        }
      }
    })
    return channelName
  }

  registerPatterns () {
    let patterns = <%= serialize(options.patterns) %>
      Object.keys(patterns).forEach(pattern => {
        this.patterns[pattern] = patterns[pattern]
      })
  }

  leaveFromChannels () {
    this.publicChannels.forEach(channel => this._echo.leave(channel))
    this.privateChannels.forEach(channel => this._echo.leave(channel))
    this.presenceChannels.forEach(channel => this._echo.leave(channel))
  }
}

export default (ctx, inject) => {
  let { store } = ctx

  <% if (options.authInterceptor ) { %>
    const authInter = <%= serialize(options.authInterceptor).replace('authInterceptor(', 'function(').replace('function function', 'function') %>
    const auth = authInter(store)
      <% } %>

  let config = {
      namespace: 'Events',
      broadcaster: 'socket.io',
      host: <%= options.host ? serialize(options.host) : '"http://localhost"' %>,
      auth
  }

  let echo = new Echo(config)
  let observer = new Observer(echo, store)

  Vue.use(Socket, observer)
  ctx.$echo = observer
  inject('echo', observer)
}
