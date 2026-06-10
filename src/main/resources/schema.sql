CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_cycle_length INT DEFAULT 28,
    default_period_duration INT DEFAULT 5,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP
);

CREATE TABLE IF NOT EXISTS periods (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moods (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    mood_date DATE NOT NULL,
    mood VARCHAR(50) NOT NULL,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS symptoms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    symptom_date DATE NOT NULL,
    symptom VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lifestyle_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    log_date DATE NOT NULL,
    sleep_quality VARCHAR(50),
    sleep_duration DOUBLE,
    water_intake DOUBLE,
    exercise_duration INT,
    walking_steps INT,
    stress_level INT,
    workload INT,
    diet_quality VARCHAR(50),
    caffeine_intake INT,
    alcohol_intake INT,
    energy_level INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
