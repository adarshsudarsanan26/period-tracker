package com.pms.tracker.service;

import com.pms.tracker.dto.PredictionResponse;
import com.pms.tracker.model.Period;
import com.pms.tracker.model.User;
import com.pms.tracker.model.Mood;
import com.pms.tracker.model.Symptom;
import com.pms.tracker.model.LifestyleLog;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PredictionEngine {

    public PredictionResponse calculatePredictions(User user, List<Period> periods, List<Mood> moods, List<Symptom> symptoms, List<LifestyleLog> lifestyles) {
        int avgCycleLength = user.getDefaultCycleLength();
        int avgPeriodDuration = user.getDefaultPeriodDuration();

        // Sort periods chronologically
        List<Period> sortedPeriods = periods.stream()
                .sorted(Comparator.comparing(Period::getStartDate))
                .collect(Collectors.toList());

        // Calculate dynamic average cycle length
        if (sortedPeriods.size() > 1) {
            long totalCycleDays = 0;
            for (int i = 1; i < sortedPeriods.size(); i++) {
                totalCycleDays += ChronoUnit.DAYS.between(
                        sortedPeriods.get(i - 1).getStartDate(),
                        sortedPeriods.get(i).getStartDate()
                );
            }
            avgCycleLength = (int) Math.round((double) totalCycleDays / (sortedPeriods.size() - 1));
            if (avgCycleLength < 15 || avgCycleLength > 45) {
                avgCycleLength = user.getDefaultCycleLength();
            }
        }

        // Calculate dynamic average period duration
        if (!sortedPeriods.isEmpty()) {
            long totalDuration = 0;
            int count = 0;
            for (Period p : sortedPeriods) {
                if (p.getEndDate() != null) {
                    totalDuration += ChronoUnit.DAYS.between(p.getStartDate(), p.getEndDate()) + 1;
                    count++;
                }
            }
            if (count > 0) {
                avgPeriodDuration = (int) Math.round((double) totalDuration / count);
            } else {
                avgPeriodDuration = user.getDefaultPeriodDuration();
            }
            if (avgPeriodDuration < 1 || avgPeriodDuration > 15) {
                avgPeriodDuration = user.getDefaultPeriodDuration();
            }
        }

        PredictionResponse response = new PredictionResponse();
        response.setAvgCycleLength(avgCycleLength);
        response.setAvgPeriodDuration(avgPeriodDuration);

        if (sortedPeriods.isEmpty()) {
            response.setPmsStatus("NO_DATA");
            response.setCurrentPhase("NO_DATA");
            response.setCurrentCycleDay(0);
            response.setDaysRemaining(0);
            
            List<String> defaultPatterns = new ArrayList<>();
            defaultPatterns.add("Log your cycle start dates to unlock personalized pattern analysis.");
            defaultPatterns.add("LunaTip: Logging sleep, mood, and symptoms daily yields accurate correlations.");
            response.setAiPatterns(defaultPatterns);
            return response;
        }

        Period lastPeriod = sortedPeriods.get(sortedPeriods.size() - 1);
        LocalDate lastStart = lastPeriod.getStartDate();
        LocalDate today = LocalDate.now();

        // Predictions relative to the last period start date
        LocalDate nextPeriodStart = lastStart.plusDays(avgCycleLength);
        LocalDate nextPeriodEnd = nextPeriodStart.plusDays(avgPeriodDuration - 1);
        LocalDate pmsStart = nextPeriodStart.minusDays(7);
        LocalDate pmsEnd = nextPeriodStart.minusDays(1);
        LocalDate ovulation = nextPeriodStart.minusDays(14);
        LocalDate fertileStart = ovulation.minusDays(5);
        LocalDate fertileEnd = ovulation;

        response.setNextPeriodStartDate(nextPeriodStart);
        response.setNextPeriodEndDate(nextPeriodEnd);
        response.setPmsStartDate(pmsStart);
        response.setPmsEndDate(pmsEnd);
        response.setOvulationDate(ovulation);
        response.setFertileStartDate(fertileStart);
        response.setFertileEndDate(fertileEnd);

        // Cycle day logic
        int currentCycleDay;
        if (today.isBefore(lastStart)) {
            currentCycleDay = 1;
        } else {
            currentCycleDay = (int) ChronoUnit.DAYS.between(lastStart, today) + 1;
        }
        response.setCurrentCycleDay(currentCycleDay);

        // Days remaining
        int daysRemaining = (int) ChronoUnit.DAYS.between(today, nextPeriodStart);
        if (daysRemaining < 0) {
            daysRemaining = 0;
        }
        response.setDaysRemaining(daysRemaining);

        // Status Indicator logic
        String status = "NORMAL";
        if (!today.isBefore(lastStart) && (lastPeriod.getEndDate() == null || !today.isAfter(lastPeriod.getEndDate()))) {
            status = "PERIOD_ONGOING";
        } else if (today.isAfter(nextPeriodStart) || !today.isBefore(nextPeriodStart.minusDays(2)) && !today.isAfter(nextPeriodStart)) {
            status = "PERIOD_EXPECTED_SOON";
        } else if (!today.isBefore(pmsStart) && !today.isAfter(pmsEnd)) {
            status = "PMS_LIKELY";
        }
        response.setPmsStatus(status);

        // Calculate cycle phase
        String currentPhase = "NO_DATA";
        LocalDate periodEndBoundary = lastPeriod.getEndDate() != null ? lastPeriod.getEndDate() : lastStart.plusDays(avgPeriodDuration - 1);
        LocalDate ovulationDay = lastStart.plusDays(avgCycleLength - 14);
        LocalDate ovulationStart = ovulationDay.minusDays(1);
        LocalDate ovulationEnd = ovulationDay.plusDays(1);

        if (today.isBefore(lastStart)) {
            currentPhase = "LUTEAL";
        } else if (!today.isAfter(periodEndBoundary)) {
            currentPhase = "MENSTRUAL";
        } else if (today.isBefore(ovulationStart)) {
            currentPhase = "FOLLICULAR";
        } else if (!today.isAfter(ovulationEnd)) {
            currentPhase = "OVULATION";
        } else {
            currentPhase = "LUTEAL";
        }
        response.setCurrentPhase(currentPhase);

        // ------------------ AI Pattern Detection ------------------
        List<String> aiPatterns = new ArrayList<>();

        // Correlation 1: Sleep deprivation vs Irritability/Mood
        List<LifestyleLog> shortSleepLogs = lifestyles.stream()
                .filter(l -> l.getSleepDuration() != null && l.getSleepDuration() < 6.0)
                .collect(Collectors.toList());
        List<LifestyleLog> normalSleepLogs = lifestyles.stream()
                .filter(l -> l.getSleepDuration() != null && l.getSleepDuration() >= 6.0)
                .collect(Collectors.toList());

        if (shortSleepLogs.size() >= 2 && normalSleepLogs.size() >= 2) {
            long shortSleepIrritable = 0;
            for (LifestyleLog l : shortSleepLogs) {
                LocalDate d = l.getLogDate();
                boolean isIrritable = moods.stream().anyMatch(m -> m.getMoodDate().equals(d) && (m.getMood().equals("😡") || m.getMood().equals("😔") || m.getMood().equals("🤐"))) ||
                                      symptoms.stream().anyMatch(s -> s.getSymptomDate().equals(d) && (s.getSymptom().equalsIgnoreCase("Irritability") || s.getSymptom().equalsIgnoreCase("Mood swings") || s.getSymptom().equalsIgnoreCase("Anger")));
                if (isIrritable) shortSleepIrritable++;
            }

            long normalSleepIrritable = 0;
            for (LifestyleLog l : normalSleepLogs) {
                LocalDate d = l.getLogDate();
                boolean isIrritable = moods.stream().anyMatch(m -> m.getMoodDate().equals(d) && (m.getMood().equals("😡") || m.getMood().equals("😔") || m.getMood().equals("🤐"))) ||
                                      symptoms.stream().anyMatch(s -> s.getSymptomDate().equals(d) && (s.getSymptom().equalsIgnoreCase("Irritability") || s.getSymptom().equalsIgnoreCase("Mood swings") || s.getSymptom().equalsIgnoreCase("Anger")));
                if (isIrritable) normalSleepIrritable++;
            }

            double rateShort = (double) shortSleepIrritable / shortSleepLogs.size();
            double rateNormal = (double) normalSleepIrritable / normalSleepLogs.size();

            if (rateShort > rateNormal) {
                int percentIncrease;
                if (rateNormal > 0) {
                    percentIncrease = (int) Math.round(((rateShort - rateNormal) / rateNormal) * 100);
                } else {
                    percentIncrease = (int) Math.round(rateShort * 100);
                }
                if (percentIncrease > 0) {
                    aiPatterns.add("Sleep deprivation increases irritability by " + percentIncrease + "%.");
                    aiPatterns.add("Mood swings were " + percentIncrease + "% more common when sleep was under 6 hours.");
                }
            }
        }

        // Correlation 2: Symptom timing relative to next period start
        double avgAngerOffset = getAverageOffsetDaysForSymptom(symptoms, sortedPeriods, "Anger");
        if (avgAngerOffset > 0) {
            aiPatterns.add("Anger typically appears " + (int) Math.round(avgAngerOffset) + " days before menstruation.");
        }

        double avgSilentOffset = getAverageOffsetDaysForSymptom(symptoms, sortedPeriods, "Silent behavior");
        if (avgSilentOffset > 0) {
            aiPatterns.add("Silent behavior is most common " + (int) Math.round(avgSilentOffset) + " days before period onset.");
        }

        // Correlation 3: Luteal phase check for crying episodes
        long totalCrying = symptoms.stream().filter(s -> s.getSymptom().equalsIgnoreCase("Crying easily")).count();
        if (totalCrying >= 2) {
            long lateLutealCrying = 0;
            for (Symptom s : symptoms) {
                if (s.getSymptom().equalsIgnoreCase("Crying easily")) {
                    LocalDate d = s.getSymptomDate();
                    Period lastStartBefore = null;
                    for (Period p : sortedPeriods) {
                        if (!p.getStartDate().isAfter(d)) {
                            lastStartBefore = p;
                        }
                    }
                    if (lastStartBefore != null) {
                        long cycleDay = ChronoUnit.DAYS.between(lastStartBefore.getStartDate(), d) + 1;
                        if (cycleDay >= 22 && cycleDay <= 28) {
                            lateLutealCrying++;
                        }
                    }
                }
            }
            double lutealRatio = (double) lateLutealCrying / totalCrying;
            if (lutealRatio >= 0.5) {
                aiPatterns.add("Crying episodes occur most frequently during the late luteal phase.");
            }
        }

        if (aiPatterns.isEmpty()) {
            aiPatterns.add("Patterns such as sleep impact, anger offsets, and phase behaviors unlock as more logs are recorded.");
            aiPatterns.add("LunaTip: Ensure you log both lifestyle habits and symptoms on the same days to enable correlation analysis.");
        }

        response.setAiPatterns(aiPatterns);
        return response;
    }

    private double getAverageOffsetDaysForSymptom(List<Symptom> symptoms, List<Period> sortedPeriods, String symptomName) {
        List<Symptom> matched = symptoms.stream()
                .filter(s -> s.getSymptom().equalsIgnoreCase(symptomName))
                .collect(Collectors.toList());
        if (matched.isEmpty()) return -1;

        long totalOffset = 0;
        int count = 0;
        for (Symptom s : matched) {
            LocalDate d = s.getSymptomDate();
            LocalDate nextStart = null;
            for (Period p : sortedPeriods) {
                if (p.getStartDate().isAfter(d)) {
                    nextStart = p.getStartDate();
                    break;
                }
            }
            if (nextStart != null) {
                long offset = ChronoUnit.DAYS.between(d, nextStart);
                if (offset <= 14) { 
                    totalOffset += offset;
                    count++;
                }
            }
        }
        return count > 0 ? (double) totalOffset / count : -1;
    }
}
