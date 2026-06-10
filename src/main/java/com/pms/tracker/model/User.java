package com.pms.tracker.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username is required")
    @Column(unique = true)
    private String username;

    @NotBlank(message = "Password hash is required")
    @Column(name = "password_hash")
    private String passwordHash;

    @NotBlank(message = "Name is required")
    private String name;

    @Column(name = "default_cycle_length")
    private int defaultCycleLength = 28;

    @Column(name = "default_period_duration")
    private int defaultPeriodDuration = 5;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private java.time.LocalDateTime resetTokenExpiry;

    // Constructors
    public User() {}

    public User(String username, String passwordHash, String name) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.name = name;
    }

    public User(String username, String passwordHash, String name, int defaultCycleLength, int defaultPeriodDuration) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.name = name;
        this.defaultCycleLength = defaultCycleLength;
        this.defaultPeriodDuration = defaultPeriodDuration;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getDefaultCycleLength() { return defaultCycleLength; }
    public void setDefaultCycleLength(int defaultCycleLength) { this.defaultCycleLength = defaultCycleLength; }

    public int getDefaultPeriodDuration() { return defaultPeriodDuration; }
    public void setDefaultPeriodDuration(int defaultPeriodDuration) { this.defaultPeriodDuration = defaultPeriodDuration; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public java.time.LocalDateTime getResetTokenExpiry() { return resetTokenExpiry; }
    public void setResetTokenExpiry(java.time.LocalDateTime resetTokenExpiry) { this.resetTokenExpiry = resetTokenExpiry; }
}
