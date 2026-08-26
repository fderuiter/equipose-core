FROM eclipse-temurin:17-jre-alpine

# Install curl, bash
RUN apk add --no-cache curl bash

# Download and extract Neo4j community edition 5.20.0
RUN curl -L https://dist.neo4j.org/neo4j-community-5.20.0-unix.tar.gz -o /tmp/neo4j.tar.gz \
    && tar -xzf /tmp/neo4j.tar.gz -C /opt \
    && mv /opt/neo4j-community-5.20.0 /opt/neo4j \
    && rm /tmp/neo4j.tar.gz

WORKDIR /opt/neo4j

# Set environments
ENV PATH="/opt/neo4j/bin:${PATH}"

# Expose ports
EXPOSE 7474 7687

# Configure neo4j to allow connections from outside the container, and disable auth
RUN sed -i 's/#server.default_listen_address=0.0.0.0/server.default_listen_address=0.0.0.0/g' /opt/neo4j/conf/neo4j.conf \
    && sed -i 's/#dbms.security.auth_enabled=false/dbms.security.auth_enabled=false/g' /opt/neo4j/conf/neo4j.conf

CMD ["neo4j", "console"]
