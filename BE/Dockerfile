FROM maven:3.9-eclipse-temurin-26-noble AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:21.0.13.1_2-jre-noble
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system minisocial \
    && useradd --system --gid minisocial --home-dir /app --shell /usr/sbin/nologin minisocial
WORKDIR /app
COPY --from=build --chown=minisocial:minisocial \
    /workspace/target/minisocial-be-0.0.1-SNAPSHOT.jar /app/app.jar
USER minisocial
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=45s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
