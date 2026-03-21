#!/bin/sh
set -eu

cluster_name="${DEMO_CLUSTER_NAME:-evidra-demo}"
kubeconfig_dir="${KUBECONFIG_DIR:-/kube}"
kubeconfig_path="${KUBECONFIG_PATH:-$kubeconfig_dir/config}"
api_host="${DEMO_KIND_API_HOST:-host.docker.internal}"

mkdir -p "$kubeconfig_dir"

if ! kind get clusters | grep -Fxq "$cluster_name"; then
  kind create cluster \
    --name "$cluster_name" \
    --config /demo/kind-config.yaml \
    --kubeconfig "$kubeconfig_path"
fi

kind export kubeconfig --name "$cluster_name" --kubeconfig "$kubeconfig_path"

api_port="$(awk -F: '/server: https:\/\/127\.0\.0\.1:/{print $NF}' "$kubeconfig_path" | head -n1)"

if [ -n "$api_port" ]; then
  sed -i.bak "s#server: https://127.0.0.1:${api_port}#server: https://${api_host}:${api_port}#g" "$kubeconfig_path"
  rm -f "${kubeconfig_path}.bak"
fi

if ! grep -Fq 'tls-server-name: kubernetes' "$kubeconfig_path"; then
  tmp="${kubeconfig_path}.tmp"
  awk '
    /server: https:\/\// && inserted == 0 {
      print
      print "    tls-server-name: kubernetes"
      inserted = 1
      next
    }
    { print }
  ' "$kubeconfig_path" >"$tmp"
  mv "$tmp" "$kubeconfig_path"
fi
