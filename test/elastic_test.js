/* eslint-env mocha */
'use strict'

const path = require('path')
const rewire = require('rewire')
const assert = require('assert')
const { ConnectionInfo } = require(path.join(__dirname, '..', 'connectionInfo.js'))

const sut = rewire(path.join(__dirname, '..', 'elastic.js'))

const connection = new ConnectionInfo()
function _setupRequestMock (response) {
  const mock = {
    request: async function (...args) {
      mock.__request.push(args)
      return response
    },
    __request: []
  }
  sut.__set__('request', mock.request)

  return mock
}

function _setupGetRequestMock (response) {
  const mock = {
    get: async function (...args) {
      mock.__request.push(args)
      return response
    },
    __request: []
  }
  sut.__set__('request', mock)

  return mock
}

describe('elastic', function () {
  describe('#loadIndices', function () {
    it('should load index from elastic', async function () {
      const mock = _setupGetRequestMock('i-1\ni-2\n')

      await sut.loadIndices(connection)

      assert.strictEqual(1, mock.__request.length)
      assert.strictEqual('http://localhost:9200/_cat/indices/?h=index', mock.__request[0][0])
    })

    it('should parse indexes using raw text', async function () {
      _setupGetRequestMock('i-1\ni-2\n')

      const indices = await sut.loadIndices(connection)

      assert.deepStrictEqual(['i-1', 'i-2'], indices)
    })

    it('should handle elastic failing', async function () {
      sut.__set__('request.get', async function () {
        throw Error('Unexpected failure')
      })
      let hadError = false

      try {
        await sut.loadIndices(connection)
      } catch (error) {
        hadError = true
        assert.strictEqual('Unexpected failure', error.message)
      }

      assert.strictEqual(true, hadError)
    })
  })

  describe('#loadSnapshots', function () {
    it('should load snapshots from elastic', async function () {
      const mock = _setupRequestMock({
        snapshots: [
          {
            snapshot: 's-1',
            indices: ['i-1'],
            state: 'SUCCESS'
          },
          {
            snapshot: 's-2',
            indices: ['i-1', 'i-2'],
            state: 'SUCCESS'
          }
        ]
      })

      const snapshots = await sut.loadSnapshots(connection, 'my-repo', 's-*')

      assert.deepStrictEqual(['s-2', 's-1'], snapshots)
      assert.strictEqual(1, mock.__request.length)
      assert.strictEqual('http://localhost:9200/_snapshot/my-repo/s-*', mock.__request[0][0].uri)
    })

    it('should buble up elastic not loading indices', async function () {
      sut.__set__('request', async function () {
        throw Error('Unexpected failure')
      })
      let hadError = false

      try {
        await sut.loadSnapshots(connection, 'my-repo', 's-*')
      } catch (error) {
        hadError = true
      }

      assert.strictEqual(true, hadError)
    })
  })

  describe('#restoreIndexFromSnapshot', function () {
    it('should require info', async function () {
      _setupRequestMock({ accepted: true })
      let hadError = false

      try {
        await sut.restoreIndexFromSnapshot(undefined, 'my-repo', 'snapshot', 'index')
      } catch (error) {
        hadError = true
        assert.strictEqual('info must be of type ConnectionInfo', error.message)
      }

      assert.strictEqual(true, hadError)
    })

    it('should restore snapshot from elastic', async function () {
      const mock = _setupRequestMock({ accepted: true })

      await sut.restoreIndexFromSnapshot(connection, 'my-repo', 'snapshot', 'index')

      assert.strictEqual(1, mock.__request.length)
      assert.strictEqual('http://localhost:9200/_snapshot/my-repo/snapshot/_restore', mock.__request[0][0].uri)
    })

    it('should handle failure', async function () {
      _setupRequestMock({ accepted: false })
      let hadError = false

      try {
        await sut.restoreIndexFromSnapshot(connection, 'my-repo', 'snapshot', 'index')
      } catch (error) {
        hadError = true
        assert.match(error.message, /not\saccepted/)
      }

      assert.strictEqual(true, hadError)
    })

    it('should handle exception thrown by elastic', async function () {
      sut.__set__('request', async function () {
        throw Error('Unexpected failure')
      })
      let hadError = false

      try {
        await sut.restoreIndexFromSnapshot(connection, 'my-repo', 'snapshot', 'index')
      } catch (error) {
        hadError = true
        assert.match(error.message, /failed/)
      }

      assert.strictEqual(true, hadError)
    })
  })
})
