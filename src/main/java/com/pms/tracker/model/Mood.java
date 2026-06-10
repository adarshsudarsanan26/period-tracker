package com.pms.tracker.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "moods")
public class Mood {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull(message = "Mood date is required")
    @Column(name = "mood_date")
    private LocalDate moodDate;

    @NotBlank(message = "Mood is required")
    private String mood; // 😊 Happy, 😐 Normal, 😔 Sad, 😡 Angry, 😴 Tired, 🤐 Silent/Withdrawn

    @Column(columnDefinition = "TEXT")
    private String notes;

    // Constructors
    public Mood() {}

    public Mood(User user, LocalDate moodDate, String mood, String notes) {
        this.user = user;
        this.moodDate = moodDate;
        this.mood = mood;
        this.notes = notes;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDate getMoodDate() { return moodDate; }
    public void setMoodDate(LocalDate moodDate) { this.moodDate = moodDate; }

    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
