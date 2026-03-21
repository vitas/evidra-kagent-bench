#!/bin/sh
set -eu

cluster_name="${DEMO_CLUSTER_NAME:-evidra-demo}"

if kind get clusters | grep -Fxq "$cluster_name"; then
  kind delete cluster --name "$cluster_name"
fi
