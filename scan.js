'use strict'

const elastic = require('./elastic')

// Data structure to return when snapshots are restored
/*
{
  'snapshot-name' = ['list','of','restored','indexes']
}
*/

async function scan (info, repository, pattern, onUpdate) {
  if (onUpdate && typeof (onUpdate) !== 'function') {
    throw new Error('onUpdate should be of type function.')
  }
  const snapshotPromise = elastic.loadSnapshots(info, repository, 'curator-iis-*2020*')
  const indexPromise = elastic.loadIndices(info)

  const foundIndices = []
  const restoration = {}
  const snapshots = await snapshotPromise
  const indices = await indexPromise

  async function trackFoundIndex (foundSnapshotIndexes, repository, snapshot) {
    var toRestore = []
    foundSnapshotIndexes.forEach(index => {
      if (!foundIndices.includes(index)) {
        foundIndices.push(index)
        toRestore.push(index)
      }
    })

    if (toRestore.length > 0) {
      try {
        await elastic.restoreIndexFromSnapshot(info, repository, snapshot, toRestore.join(','))
        restoration[snapshot] = toRestore
      } catch (error) {
        if (onUpdate) {
          onUpdate(`Failed to restore indices from snapshot ${snapshot}`)
        }
      }
    }
  }

  if (snapshots.length === 0 && onUpdate) {
    onUpdate('No snapshots were loaded. This should not be expected.')
  }

  for (var s = 0; s < snapshots.length; s++) {
    const snapshot = snapshots[s]
    const snapshotIndices = await elastic.loadSnapshotIndices(info, repository, snapshot)

    var foundSnapshotIndexes = []
    for (var i = 0; i < snapshotIndices.length; i++) {
      const index = snapshotIndices[i]

      if (!indices.includes(index)) {
        foundSnapshotIndexes.push(index)
      }
    }

    if (foundSnapshotIndexes.length > 0) {
      await trackFoundIndex(foundSnapshotIndexes, repository, snapshot)
    }

    if (onUpdate) {
      onUpdate(`${snapshot} - added ${foundSnapshotIndexes.length}/${snapshotIndices.length}`)
    }
  }

  if (onUpdate) {
    onUpdate('finished processing')
    onUpdate(foundIndices)
  }

  return restoration
}

module.exports = {
  scan
}
