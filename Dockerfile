# Stage 1: Build the application using Gradle wrapper
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

# Copy gradle wrapper and configuration files
COPY gradle/ gradle/
COPY gradlew gradlew
COPY settings.gradle settings.gradle
COPY build.gradle build.gradle

# Grant execution permissions for the Gradle wrapper (required on Linux/Docker)
RUN chmod +x gradlew

# Download dependencies (leveraging Docker cache)
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and build the application executable jar
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Create the final lightweight runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/build/libs/tracker-0.0.1-SNAPSHOT.jar app.jar

# Render sets the PORT environment variable automatically
EXPOSE 8080

# Configure production environment defaults
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod

# Command to run the application
CMD ["java", "-jar", "app.jar"]
