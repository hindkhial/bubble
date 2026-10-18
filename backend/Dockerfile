FROM maven:3.9.11-eclipse-temurin-21@sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-alpine@sha256:51ab5e3302e7141ce665ca3ea85e8b5cd648eafbc3c0c90dd79d6537684e4555
RUN apk add --no-cache curl 'zlib>=1.3.2-r1' 'libexpat>=2.9.0-r0' 'libpng>=1.6.59-r0' && addgroup -S -g 10001 bubble && adduser -S -D -u 10001 -G bubble bubble
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/bubble-backend-0.1.0-SNAPSHOT.jar /app/bubble.jar
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=4s --start-period=60s --retries=4 CMD curl --fail --silent http://127.0.0.1:8080/api/v1/health > /dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=65", "-jar", "/app/bubble.jar"]
