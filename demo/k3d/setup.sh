#!/bin/sh
set -eu

cluster_name="${DEMO_CLUSTER_NAME:-evidra-demo}"
network="${DEMO_NETWORK:-bench}"
kubeconfig_dir="${KUBECONFIG_DIR:-/output}"

mkdir -p "$kubeconfig_dir"

# Create cluster if it doesn't exist.
if ! k3d cluster list -o json | grep -q "\"name\":\"$cluster_name\""; then
  k3d cluster create "$cluster_name" \
    --network "$network" \
    --no-lb \
    --wait \
    --k3s-arg "--disable=traefik@server:0"
fi

# Export kubeconfig.
k3d kubeconfig get "$cluster_name" > "$kubeconfig_dir/config"
echo "kubeconfig written to $kubeconfig_dir/config"
