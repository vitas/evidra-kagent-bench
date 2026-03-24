FROM docker:29-cli

ARG KIND_VERSION=v0.27.0

RUN apk add --no-cache curl
ARG TARGETARCH=amd64
RUN curl -fsSLo /usr/local/bin/kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-${TARGETARCH}" \
  && chmod +x /usr/local/bin/kind

WORKDIR /workspace

COPY demo/scripts/kind_bootstrap.sh /demo/scripts/kind_bootstrap.sh

RUN chmod +x /demo/scripts/kind_bootstrap.sh

ENTRYPOINT ["/bin/sh", "/demo/scripts/kind_bootstrap.sh"]
