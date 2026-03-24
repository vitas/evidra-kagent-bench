FROM python:3.13-slim

ARG KAGENT_GIT_REF=v0.8.0-beta9

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir uv

WORKDIR /opt
RUN git clone --depth 1 --branch "${KAGENT_GIT_REF}" https://github.com/kagent-dev/kagent.git /opt/kagent-src

WORKDIR /opt/kagent-src/python
# Pin litellm to safe version — v1.82.7+ is a supply chain attack (credential stealer).
# See: https://github.com/BerriAI/litellm/issues/24512
RUN uv sync --package kagent-adk && \
    uv pip install 'litellm<1.82.7'

ENV PATH="/opt/kagent-src/python/.venv/bin:${PATH}"

WORKDIR /app
COPY pyproject.toml pyproject.toml
COPY demoagent/ demoagent/

ENTRYPOINT ["kagent-adk", "run", "--local", "--host", "0.0.0.0", "--port", "8080"]
CMD ["demoagent"]
