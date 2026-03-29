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

# Export kubeconfig and rewrite server URL for container-to-container access.
k3d kubeconfig get "$cluster_name" > "$kubeconfig_dir/config"
sed -i "s|server: https://0\.0\.0\.0:[0-9]*|server: https://k3d-${cluster_name}-server-0:6443|" "$kubeconfig_dir/config"
echo "kubeconfig written to $kubeconfig_dir/config"
