#!/usr/bin/env bash

set -euo pipefail

IMAGE=docker.io/impierce/esdm-visualizer
GIT_SHA="sha-$(git rev-parse HEAD | cut -c1-7)"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag "${IMAGE}:${GIT_SHA}" \
  --tag "${IMAGE}:latest" \
  --push \
  .
