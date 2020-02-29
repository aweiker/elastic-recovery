'use strict'

class ConnectionInfo {
  constructor (opts) {
    const options = {
      ...{
        server: 'localhost',
        port: 9200,
        protocol: 'http',
        username: undefined,
        password: undefined
      },
      ...opts
    }

    this.server = options.server
    this.port = options.port
    this.protocol = options.protocol
    this.username = options.username
    this.password = options.password
  }

  static verify (info) {
    if (!(info instanceof ConnectionInfo)) {
      throw new Error('info must be of type ConnectionInfo')
    }
  }

  endpoint (uri) {
    if (this.username === undefined) {
      return `${this.protocol}://${this.server}:${this.port}/${uri}`
    }
    return `${this.protocol}://${this.username}:${this.password}@${this.server}:${this.port}/${uri}`
  }
}

module.exports = { ConnectionInfo }
