package com.pms.tracker.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "partner_config")
public class PartnerConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owner user - one configuration per user
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "partner_email", nullable = false)
    private String partnerEmail;

    // Dashboard token for public link
    @Column(name = "dashboard_token", unique = true, nullable = false)
    private String dashboardToken;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;

    @Column(name = "last_notified_phase")
    private String lastNotifiedPhase;

    @Column(name = "last_notified_pms_status")
    private String lastNotifiedPmsStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Default constructor
    public PartnerConfig() {}

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getPartnerEmail() { return partnerEmail; }
    public void setPartnerEmail(String partnerEmail) { this.partnerEmail = partnerEmail; }
    
    public String getDashboardToken() { return dashboardToken; }
    public void setDashboardToken(String dashboardToken) { this.dashboardToken = dashboardToken; }
    
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getLastNotifiedPhase() { return lastNotifiedPhase; }
    public void setLastNotifiedPhase(String lastNotifiedPhase) { this.lastNotifiedPhase = lastNotifiedPhase; }

    public String getLastNotifiedPmsStatus() { return lastNotifiedPmsStatus; }
    public void setLastNotifiedPmsStatus(String lastNotifiedPmsStatus) { this.lastNotifiedPmsStatus = lastNotifiedPmsStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Helper to generate dashboard link
    @Transient
    public String generateDashboardLink(String baseUrl) {
        if (dashboardToken == null || dashboardToken.isEmpty()) return null;
        return baseUrl + "/partner/dashboard/" + dashboardToken;
    }
}
