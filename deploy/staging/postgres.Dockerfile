FROM postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24
# Replace the upstream Go-based privilege helper with Alpine's small C helper.
# Fail the build if the pinned entrypoint no longer has exactly this call site.
RUN apk add --no-cache su-exec 'zlib>=1.3.2-r1' \
    && test "$(grep -c 'exec gosu postgres ' /usr/local/bin/docker-entrypoint.sh)" = 1 \
    && sed -i 's/exec gosu postgres /exec su-exec postgres /' /usr/local/bin/docker-entrypoint.sh \
    && rm /usr/local/bin/gosu
