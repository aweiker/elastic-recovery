/* eslint-env mocha */
'use strict'

const path = require('path')
const rewire = require('rewire')
const assert = require('assert')

const sut = rewire(path.join(__dirname, '..', 'scan.js'))

function _setupElasticMock (snapshots) {
  const elasticMock = {
    loadSnapshots: async function (...args) {
      elasticMock.__loadSnapshots.push(args)
      return Object.keys(snapshots).map(s => {
        return { name: s, indices: snapshots[s] }
      })
    },
    loadIndices: async function () {
      return []
    },
    restoreIndexFromSnapshot: async function (...args) {
      elasticMock.__restoreIndexFromSnapshot.push(args)
    },
    __restoreIndexFromSnapshot: [],
    __loadSnapshots: []
  }
  sut.__set__('elastic', elasticMock)
  return elasticMock
}

describe('Scan', function () {
  describe('#scan()', function () {
    it('should scan specified repository', async function () {
      const mock = _setupElasticMock({
        's-1': ['i-1', 'i-2', 'i-3']
      })

      const result = await sut.scan({}, 'my-repository')

      assert.ok(result)
      assert.strictEqual(1, mock.__loadSnapshots.length)
      assert.strictEqual('my-repository', mock.__loadSnapshots[0][1])
    })

    it('should scan snapshots', async function () {
      _setupElasticMock({ 's-1': ['i-1', 'i-2', 'i-3'] })

      const result = await sut.scan()

      assert.deepStrictEqual({
        's-1': ['i-1', 'i-2', 'i-3']
      }, result)
    })

    it('should use pattern for filtering snapshots', async function () {
      const mock = _setupElasticMock({
        's-1': ['i-1', 'i-2', 'i-3']
      })

      await sut.scan({}, 'my-repository', 's-*')

      assert.strictEqual('s-*', mock.__loadSnapshots[0][2])
    })

    it('should halt if no snapshots are found', async function () {
      _setupElasticMock({ })

      const result = await sut.scan()

      assert.deepStrictEqual({}, result)
    })

    it('should restore snapshot index', async function () {
      const mock = _setupElasticMock({ 's-1': ['i-1'] })

      const result = await sut.scan()

      assert.ok(result)
      assert.strictEqual(1, mock.__restoreIndexFromSnapshot.length)
      assert.deepStrictEqual([undefined, undefined, 's-1', 'i-1'], mock.__restoreIndexFromSnapshot[0])
    })

    it('should handle failing to restore from a snapshot', async function () {
      const mock = _setupElasticMock({ 's-1': ['i-1'] })
      mock.restoreIndexFromSnapshot = async function () {
        throw new Error('I failed')
      }

      const updateMessages = []

      await sut.scan(null, null, null, function (message) {
        updateMessages.push(message)
      })

      assert.strictEqual(1, updateMessages[0].match(/Failed.*s-1/).length)
    })

    it('should restore indexes from one snapshot if in multiple', async function () {
      const mock = _setupElasticMock({
        's-1': ['i-1', 'i-2', 'i-3'],
        's-2': ['i-1', 'i-2', 'i-3']
      })

      const result = await sut.scan()

      assert.ok(result)
      assert.strictEqual(1, mock.__restoreIndexFromSnapshot.length)
      assert.strictEqual('s-1', mock.__restoreIndexFromSnapshot[0][2])
      assert.strictEqual('i-1,i-2,i-3', mock.__restoreIndexFromSnapshot[0][3])
    })

    it('should restore missing indexes from additional snapshots', async function () {
      const mock = _setupElasticMock({
        's-1': ['i-1', 'i-2', 'i-3'],
        's-2': ['i-1', 'i-2', 'i-3', 'i-4']
      })

      const result = await sut.scan()

      assert.ok(result)
      assert.strictEqual(2, mock.__restoreIndexFromSnapshot.length)
      assert.strictEqual('s-1', mock.__restoreIndexFromSnapshot[0][2])
      assert.strictEqual('i-1,i-2,i-3', mock.__restoreIndexFromSnapshot[0][3])
      assert.strictEqual('s-2', mock.__restoreIndexFromSnapshot[1][2])
      assert.strictEqual('i-4', mock.__restoreIndexFromSnapshot[1][3])
    })
  })
})
