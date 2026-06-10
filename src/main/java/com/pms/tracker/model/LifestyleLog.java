package com.pms.tracker.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "lifestyle_logs")
public class LifestyleLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull(message = "Log date is required")
    @Column(name = "log_date")
    private LocalDate logDate;

    @Column(name = "sleep_quality")
    private String sleepQuality; // Poor, Fair, Good, Excellent

    @Column(name = "sleep_duration")
    private Double sleepDuration; // hours

    @Column(name = "water_intake")
    private Double waterIntake; // liters

    @Column(name = "exercise_duration")
    private Integer exerciseDuration; // minutes

    @Column(name = "walking_steps")
    private Integer walkingSteps;

    @Column(name = "stress_level")
    private Integer stressLevel; // 1 to 5

    @Column(name = "workload")
    private Integer workload; // 1 to 5

    @Column(name = "diet_quality")
    private String dietQuality; // Poor, Fair, Good, Excellent

    @Column(name = "caffeine_intake")
    private Integer caffeineIntake; // cups

    @Column(name = "alcohol_intake")
    private Integer alcoholIntake; // units

    @Column(name = "energy_level")
    private Integer energyLevel; // 1 to 5

    // Constructors
    public LifestyleLog() {}

    public LifestyleLog(User user, LocalDate logDate) {
        this.user = user;
        this.logDate = logDate;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDate getLogDate() { return logDate; }
    public void setLogDate(LocalDate logDate) { this.logDate = logDate; }

    public String getSleepQuality() { return sleepQuality; }
    public void setSleepQuality(String sleepQuality) { this.sleepQuality = sleepQuality; }

    public Double getSleepDuration() { return sleepDuration; }
    public void setSleepDuration(Double sleepDuration) { this.sleepDuration = sleepDuration; }

    public Double getWaterIntake() { return waterIntake; }
    public void setWaterIntake(Double waterIntake) { this.waterIntake = waterIntake; }

    public Integer getExerciseDuration() { return exerciseDuration; }
    public void setExerciseDuration(Integer exerciseDuration) { this.exerciseDuration = exerciseDuration; }

    public Integer getWalkingSteps() { return walkingSteps; }
    public void setWalkingSteps(Integer walkingSteps) { this.walkingSteps = walkingSteps; }

    public Integer getStressLevel() { return stressLevel; }
    public void setStressLevel(Integer stressLevel) { this.stressLevel = stressLevel; }

    public Integer getWorkload() { return workload; }
    public void setWorkload(Integer workload) { this.workload = workload; }

    public String getDietQuality() { return dietQuality; }
    public void setDietQuality(String dietQuality) { this.dietQuality = dietQuality; }

    public Integer getCaffeineIntake() { return caffeineIntake; }
    public void setCaffeineIntake(Integer caffeineIntake) { this.caffeineIntake = caffeineIntake; }

    public Integer getAlcoholIntake() { return alcoholIntake; }
    public void setAlcoholIntake(Integer alcoholIntake) { this.alcoholIntake = alcoholIntake; }

    public Integer getEnergyLevel() { return energyLevel; }
    public void setEnergyLevel(Integer energyLevel) { this.energyLevel = energyLevel; }
}
