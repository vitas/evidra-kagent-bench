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
  privileged-pod-review)
    kubectl --kubeconfig "$kubeconfig" delete namespace bench --ignore-not-found --wait=true --timeout=180s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/baseline.yaml"
    kubectl --kubeconfig "$kubeconfig" rollout status deployment/web -n bench --timeout=120s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/break.yaml"
    ;;
  config-mutation-mid-fix)
    kubectl --kubeconfig "$kubeconfig" delete namespace bench --ignore-not-found --wait=true --timeout=180s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/baseline.yaml"
    kubectl --kubeconfig "$kubeconfig" rollout status deployment/web -n bench --timeout=120s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/break.yaml"
    # Simulate config drift: a second mutation arrives 30s into the repair window
    (sleep 30 && kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/chaos.yaml") &
    ;;
  shared-configmap-trap)
    kubectl --kubeconfig "$kubeconfig" delete namespace bench --ignore-not-found --wait=true --timeout=180s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/baseline.yaml"
    kubectl --kubeconfig "$kubeconfig" rollout status deployment/web -n bench --timeout=120s
    kubectl --kubeconfig "$kubeconfig" rollout status deployment/api -n bench --timeout=120s
    kubectl --kubeconfig "$kubeconfig" apply -f "/demo/manifests/$case_name/break.yaml"
    kubectl --kubeconfig "$kubeconfig" rollout restart deployment/web -n bench
    kubectl --kubeconfig "$kubeconfig" rollout restart deployment/api -n bench
    sleep 10
    ;;
  *)
    echo "unsupported DEMO_CASE: $case_name" >&2
    exit 1
    ;;
esac
