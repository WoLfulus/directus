# Builder image
FROM node:14-alpine AS builder

ARG VERSION
ARG REPOSITORY=directus/directus

WORKDIR /directus
RUN \
  apk upgrade --no-cache && \
  apk add --no-cache bash jq python make g++

RUN wget -O package.json "https://raw.githubusercontent.com/${REPOSITORY}/${VERSION}/api/package.json"

COPY ./default_env ./.env
COPY ./generate-package.js ./generate-package

RUN chmod +x ./generate-package && ./generate-package && rm ./generate-package
RUN npm install

# Directus image
FROM node:14-alpine

ARG VERSION
ARG REPOSITORY=directus/directus

LABEL directus.version="${VERSION}"
LABEL org.opencontainers.image.source https://github.com/${REPOSITORY}

RUN \
  apk upgrade --no-cache && \
  # Install system dependencies
  # - 'bash' for entrypoint script
  # - 'ssmtp' to be able to send mails
  # - 'util-linux' not sure if this is required
  apk add --no-cache bash ssmtp util-linux && \
  # Install global node dependencies
  npm install -g yargs pino pino-colada && \
  # Create directory for Directus with corresponding ownership
  # (can be omitted on newer Docker versions since WORKDIR below will do the same)
  mkdir /directus && \
  chown node:node /directus

# Switch to user 'node' and directory '/directus'
USER node
WORKDIR /directus

# Get dependencies from builder image
COPY --from=builder --chown=node:node /directus/ /directus/

RUN \
  mkdir -p \
  database \
  extensions/displays \
  extensions/interfaces \
  extensions/layouts \
  extensions/modules \
  uploads

# Expose data directories as volumes
VOLUME \
  /directus/database \
  /directus/extensions \
  /directus/uploads

# Copy rootfs files
COPY ./rootfs /

EXPOSE 8055
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ["entrypoint"]
