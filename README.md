# Elastic Recovery

A tool designed to make it easy to restore logs that are ingested into ElastiStack. elastic-recovery will scan a [snapshot repository](https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-restore.html) looking for all indices that have been backed up and then restore each one. This is useful when [Cross-cluster replication](https://www.elastic.co/guide/en/elasticsearch/reference/current/ccr-overview.html) is not available or needed.

Build Status: [![CircleCI](https://circleci.com/gh/aweiker/elastic-recovery.svg?style=svg)](https://circleci.com/gh/aweiker/elastic-recovery)
