# Elastic Recovery

A tool designed to make it easy to restore logs that are ingested into ElastiStack. elastic-recovery will scan a [snapshot repository](https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-restore.html) looking for all indices that have been backed up and then restore each one. This is useful when [Cross-cluster replication](https://www.elastic.co/guide/en/elasticsearch/reference/current/ccr-overview.html) is not available or needed.

Build Status: ![Node.js CI](https://github.com/aweiker/elastic-recovery/workflows/Node.js%20CI/badge.svg)