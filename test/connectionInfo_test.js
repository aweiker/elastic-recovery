/* eslint-env mocha */
'use strict'

const path = require('path')
const assert = require('assert')

const { ConnectionInfo } = require(path.join(__dirname, '..', 'connectionInfo.js'))

describe('ConnectionInfo', function () {
  describe('#ctor', function () {
    it('should default to logical values', async function () {
      const info = new ConnectionInfo()

      assert.strictEqual('localhost', info.server)
      assert.strictEqual(9200, info.port)
      assert.strictEqual('http', info.protocol)
      assert.strictEqual(undefined, info.username)
      assert.strictEqual(undefined, info.password)
    })

    it('should override values in constructor', function () {
      const options = {
        server: 'es',
        port: 443,
        protocol: 'https',
        username: 'secure',
        password: 'me'
      }
      const info = new ConnectionInfo(options)

      assert.strictEqual(options.server, info.server)
      assert.strictEqual(options.port, info.port)
      assert.strictEqual(options.protocol, info.protocol)
      assert.strictEqual(options.username, info.username)
      assert.strictEqual(options.password, info.password)
    })
  })

  describe('#endpoint', function () {
    it('should exclude credentials', function () {
      const info = new ConnectionInfo()

      const uri = info.endpoint('_cat')

      assert.strictEqual('http://localhost:9200/_cat', uri)
    })

    it('should include credentials when specified', function () {
      const options = {
        server: 'es',
        port: 443,
        protocol: 'https',
        username: 'secure',
        password: 'me'
      }
      const info = new ConnectionInfo(options)

      const uri = info.endpoint('_cat')

      assert.strictEqual('https://secure:me@es:443/_cat', uri)
    })
  })
})
