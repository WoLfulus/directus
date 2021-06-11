FROM docker:stable

RUN \
  apk update && \
  apk upgrade && \
  apk add bash jq curl

COPY ./rootfs/ /

RUN \
  mkdir -p ~/.docker/cli-plugins && \
  curl -sSL -o ~/.docker/cli-plugins/docker-buildx $(curl -sL https://api.github.com/repos/docker/buildx/releases/latest | jq -r '.assets[].browser_download_url' | grep linux-amd64) && \
  chmod +x ~/.docker/cli-plugins/docker-buildx \
  chmod +x /usr/bin/lib/argsf && \
  chmod +x /usr/bin/entrypoint && \
  chmod +x /usr/bin/semver

ENTRYPOINT ["entrypoint"]
