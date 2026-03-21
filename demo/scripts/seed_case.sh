#!/bin/sh
set -eu

case_name="${DEMO_CASE:-broken-deployment}"
kubeconfig="${KUBECONFIG:-/kube/config}"

case "$case_name" in
  broken-deployment)
    kubectl --kubeconfig "$kubeconfig" delete namespace demo --ignore-not-found --wait=true --timeout=180s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/baseline.yaml"
    kubectl --kubeconfig "$kubeconfig" rollout status deployment/web -n demo --timeout=120s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/break.yaml"
    ;;
  repair-loop-escalation)
    kubectl --kubeconfig "$kubeconfig" delete namespace bench --ignore-not-found --wait=true --timeout=180s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/baseline.yaml"
    kubectl --kubeconfig "$kubeconfig" rollout status deployment/web -n bench --timeout=120s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/break.yaml"
    kubectl --kubeconfig "$kubeconfig" rollout restart deployment/web -n bench
    sleep 10
    ;;
  *)
    echo "unsupported DEMO_CASE: $case_name" >&2
    exit 1
    ;;
esac
