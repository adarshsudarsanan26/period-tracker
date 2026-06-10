package com.pms.tracker.dto;

import java.time.LocalDate;
import java.util.List;

public class DailyLogDTO {
    private LocalDate date;
    private String mood;
    private String notes;
    private List<String> symptoms;
    
    // Lifestyle details
    private String sleepQuality;
    private Double sleepDuration;
    private Double waterIntake;
    private Integer exerciseDuration;
    private Integer walkingSteps;
    private Integer stressLevel;
    private Integer workload;
    private String dietQuality;
    private Integer caffeineIntake;
    private Integer alcoholIntake;
    private Integer energyLevel;

    // Constructors
    public DailyLogDTO() {}

    public DailyLogDTO(LocalDate date, String mood, String notes, List<String> symptoms) {
        this.date = date;
        this.mood = mood;
        this.notes = notes;
        this.symptoms = symptoms;
    }

    // Getters and Setters
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<String> getSymptoms() { return symptoms; }
    public void setSymptoms(List<String> symptoms) { this.symptoms = symptoms; }

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
