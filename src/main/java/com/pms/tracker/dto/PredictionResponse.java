package com.pms.tracker.dto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class PredictionResponse {
    private LocalDate nextPeriodStartDate;
    private LocalDate nextPeriodEndDate;
    private LocalDate pmsStartDate;
    private LocalDate pmsEndDate;
    private LocalDate ovulationDate;
    private LocalDate fertileStartDate;
    private LocalDate fertileEndDate;
    
    private int currentCycleDay;
    private int daysRemaining;
    private String pmsStatus; // NORMAL, PMS_LIKELY, PERIOD_EXPECTED_SOON, PERIOD_ONGOING, NO_DATA
    
    private int avgCycleLength;
    private int avgPeriodDuration;
    private String currentPhase; // MENSTRUAL, FOLLICULAR, OVULATION, LUTEAL, NO_DATA

    private List<String> aiPatterns = new ArrayList<>();

    // Default constructor
    public PredictionResponse() {}

    // Getters and Setters
    public LocalDate getNextPeriodStartDate() { return nextPeriodStartDate; }
    public void setNextPeriodStartDate(LocalDate nextPeriodStartDate) { this.nextPeriodStartDate = nextPeriodStartDate; }

    public LocalDate getNextPeriodEndDate() { return nextPeriodEndDate; }
    public void setNextPeriodEndDate(LocalDate nextPeriodEndDate) { this.nextPeriodEndDate = nextPeriodEndDate; }

    public LocalDate getPmsStartDate() { return pmsStartDate; }
    public void setPmsStartDate(LocalDate pmsStartDate) { this.pmsStartDate = pmsStartDate; }

    public LocalDate getPmsEndDate() { return pmsEndDate; }
    public void setPmsEndDate(LocalDate pmsEndDate) { this.pmsEndDate = pmsEndDate; }

    public LocalDate getOvulationDate() { return ovulationDate; }
    public void setOvulationDate(LocalDate ovulationDate) { this.ovulationDate = ovulationDate; }

    public LocalDate getFertileStartDate() { return fertileStartDate; }
    public void setFertileStartDate(LocalDate fertileStartDate) { this.fertileStartDate = fertileStartDate; }

    public LocalDate getFertileEndDate() { return fertileEndDate; }
    public void setFertileEndDate(LocalDate fertileEndDate) { this.fertileEndDate = fertileEndDate; }

    public int getCurrentCycleDay() { return currentCycleDay; }
    public void setCurrentCycleDay(int currentCycleDay) { this.currentCycleDay = currentCycleDay; }

    public int getDaysRemaining() { return daysRemaining; }
    public void setDaysRemaining(int daysRemaining) { this.daysRemaining = daysRemaining; }

    public String getPmsStatus() { return pmsStatus; }
    public void setPmsStatus(String pmsStatus) { this.pmsStatus = pmsStatus; }

    public int getAvgCycleLength() { return avgCycleLength; }
    public void setAvgCycleLength(int avgCycleLength) { this.avgCycleLength = avgCycleLength; }

    public int getAvgPeriodDuration() { return avgPeriodDuration; }
    public void setAvgPeriodDuration(int avgPeriodDuration) { this.avgPeriodDuration = avgPeriodDuration; }

    public List<String> getAiPatterns() { return aiPatterns; }
    public void setAiPatterns(List<String> aiPatterns) { this.aiPatterns = aiPatterns; }

    public String getCurrentPhase() { return currentPhase; }
    public void setCurrentPhase(String currentPhase) { this.currentPhase = currentPhase; }
}
