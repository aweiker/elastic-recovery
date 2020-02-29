'use strict'

const request = require('request-promise-native')
const util = require('util')
const { ConnectionInfo } = require('./connectionInfo')

async function restoreIndexFromSnapshot (info, repository, snapshot, index) {
  ConnectionInfo.verify(info)

  const options = {
    method: 'POST',
    uri: info.endpoint(`_snapshot/${repository}/${snapshot}/_restore`),
    json: true,
    body: {
      indices: index,
      ignore_index_settings: [
        // TODO: Make this an option, not hard coded
        'index.routing.allocation.require.data_type_tag'
      ]
    }
  }

  let response = null

  try {
    response = await request(options)
  } catch (error) {
    throw new Error(`Restore request failed. \n${util.inspect(options.body)}\n\n${util.inspect(error)}`)
  }

  if (!response.accepted) {
    throw new Error(`Restore was not accepted. \n${util.inspect(options.body)}\n\n${util.inspect(response)}`)
  }
}

async function loadSnapshots (info, repository, pattern) {
  // Fix up this method so that it can return a snapshot and indexes in the snapshot
  // this will prevent an N+1 lookup in elastic

  const options = {
    method: 'GET',
    uri: info.endpoint(`_snapshot/${repository}/${pattern}`),
    json: true
  }
  const { snapshots } = await request(options)
  return _extractSnapshotNames(snapshots).sort().reverse()
}

async function loadIndices (info) {
  const response = await request.get(info.endpoint('_cat/indices/?h=index'))
  return response.trim().split('\n')
}

async function loadSnapshotIndices (info, repository, snapshot) {
  const options = {
    method: 'GET',
    uri: info.endpoint(`_snapshot/${repository}/${snapshot}`),
    json: true
  }
  const { snapshots } = await request(options)

  if (snapshots.length === null || snapshots.length === 0) {
    throw new Error('Failed to load snapshot')
  }

  return snapshots[0].indices.sort()
}

function _extractSnapshotNames (snapshots) {
  const result = []
  for (let i = 0; i < snapshots.length; i++) {
    var snapshot = snapshots[i]
    if (snapshot.state === 'SUCCESS') {
      result.push(snapshots[i].snapshot)
    }
  }
  return result
}

module.exports = {
  loadSnapshotIndices,
  loadSnapshots,
  loadIndices,
  restoreIndexFromSnapshot
}
