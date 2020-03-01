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
  const options = {
    method: 'GET',
    uri: info.endpoint(`_snapshot/${repository}/${pattern}`),
    json: true
  }
  const { snapshots } = await request(options)
  return snapshots
    .filter(s => s.state === 'SUCCESS')
    .map(s => {
      return {
        name: s.snapshot,
        indices: s.indices
      }
    })
    .sort((s1, s2) => {
      return s2.name.localeCompare(s1.name)
    })
}

async function loadIndices (info) {
  const response = await request.get(info.endpoint('_cat/indices/?h=index'))
  return response.trim().split('\n')
}

module.exports = {
  loadSnapshots,
  loadIndices,
  restoreIndexFromSnapshot
}
