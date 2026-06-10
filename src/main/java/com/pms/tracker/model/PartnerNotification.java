package com.pms.tracker.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "partner_notification")
public class PartnerNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_config_id", nullable = false)
    private PartnerConfig partnerConfig;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "status", nullable = false)
    private String status;

    @Lob
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    // Constructors
    public PartnerNotification() {}

    public PartnerNotification(PartnerConfig partnerConfig, String eventType, String status, String message) {
        this.partnerConfig = partnerConfig;
        this.eventType = eventType;
        this.status = status;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public PartnerConfig getPartnerConfig() { return partnerConfig; }
    public void setPartnerConfig(PartnerConfig partnerConfig) { this.partnerConfig = partnerConfig; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
