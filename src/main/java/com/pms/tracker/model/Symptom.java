package com.pms.tracker.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "symptoms")
public class Symptom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull(message = "Symptom date is required")
    @Column(name = "symptom_date")
    private LocalDate symptomDate;

    @NotBlank(message = "Symptom name is required")
    private String symptom; // Cramps, Headache, Bloating, Mood swings, Fatigue, Food cravings

    // Constructors
    public Symptom() {}

    public Symptom(User user, LocalDate symptomDate, String symptom) {
        this.user = user;
        this.symptomDate = symptomDate;
        this.symptom = symptom;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDate getSymptomDate() { return symptomDate; }
    public void setSymptomDate(LocalDate symptomDate) { this.symptomDate = symptomDate; }

    public String getSymptom() { return symptom; }
    public void setSymptom(String symptom) { this.symptom = symptom; }
}
