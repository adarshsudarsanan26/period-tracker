package com.pms.tracker.controller;

import com.pms.tracker.model.Mood;
import com.pms.tracker.model.Period;
import com.pms.tracker.model.Symptom;
import com.pms.tracker.model.LifestyleLog;
import com.pms.tracker.model.User;
import com.pms.tracker.repository.MoodRepository;
import com.pms.tracker.repository.PeriodRepository;
import com.pms.tracker.repository.SymptomRepository;
import com.pms.tracker.repository.LifestyleLogRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private PeriodRepository periodRepository;

    @Autowired
    private MoodRepository moodRepository;

    @Autowired
    private SymptomRepository symptomRepository;

    @Autowired
    private LifestyleLogRepository lifestyleLogRepository;

    @Autowired
    private HttpSession session;

    private User getLoggedInUser() {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not logged in");
        }
        return user;
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport() {
        User user = getLoggedInUser();
        Long userId = user.getId();

        List<Period> periods = periodRepository.findByUserIdOrderByStartDateAsc(userId);
        List<Mood> moods = moodRepository.findByUserIdOrderByMoodDateAsc(userId);
        List<Symptom> symptoms = symptomRepository.findByUserIdOrderBySymptomDateAsc(userId);
        List<LifestyleLog> lifestyles = lifestyleLogRepository.findByUserIdOrderByLogDateAsc(userId);

        StringBuilder csv = new StringBuilder();

        // User info
        csv.append("--- USER PROFILE ---\n");
        csv.append("Name,").append(user.getName()).append("\n");
        csv.append("Username,").append(user.getUsername()).append("\n");
        csv.append("Default Cycle Length,").append(user.getDefaultCycleLength()).append("\n");
        csv.append("Default Period Duration,").append(user.getDefaultPeriodDuration()).append("\n\n");

        // Period logs
        csv.append("--- PERIOD LOGS ---\n");
        csv.append("ID,Start Date,End Date,Duration (Days),Status\n");
        for (Period p : periods) {
            String endDateStr = p.getEndDate() != null ? p.getEndDate().toString() : "Active";
            String durationStr = p.getEndDate() != null ? String.valueOf(ChronoUnit.DAYS.between(p.getStartDate(), p.getEndDate()) + 1) : "Ongoing";
            csv.append(p.getId()).append(",")
               .append(p.getStartDate()).append(",")
               .append(endDateStr).append(",")
               .append(durationStr).append(",")
               .append(p.getStatus() != null ? p.getStatus() : "COMPLETED").append("\n");
        }
        csv.append("\n");

        // Mood logs
        csv.append("--- DAILY MOOD & NOTES ---\n");
        csv.append("Date,Mood,Notes\n");
        for (Mood m : moods) {
            String notes = m.getNotes() != null ? m.getNotes().replace("\"", "\"\"") : "";
            csv.append(m.getMoodDate()).append(",")
               .append(m.getMood()).append(",")
               .append("\"").append(notes).append("\"\n");
        }
        csv.append("\n");

        // Symptom logs
        csv.append("--- DAILY SYMPTOMS ---\n");
        csv.append("Date,Symptom\n");
        for (Symptom s : symptoms) {
            csv.append(s.getSymptomDate()).append(",")
               .append(s.getSymptom()).append("\n");
        }
        csv.append("\n");

        // Lifestyle logs
        csv.append("--- DAILY LIFESTYLE HABITS ---\n");
        csv.append("Date,Sleep Quality,Sleep Duration (h),Water (L),Exercise (m),Steps,Stress Level,Workload,Diet Quality,Caffeine,Alcohol,Energy\n");
        for (LifestyleLog l : lifestyles) {
            csv.append(l.getLogDate()).append(",")
               .append(l.getSleepQuality() != null ? l.getSleepQuality() : "").append(",")
               .append(l.getSleepDuration() != null ? l.getSleepDuration() : "").append(",")
               .append(l.getWaterIntake() != null ? l.getWaterIntake() : "").append(",")
               .append(l.getExerciseDuration() != null ? l.getExerciseDuration() : "").append(",")
               .append(l.getWalkingSteps() != null ? l.getWalkingSteps() : "").append(",")
               .append(l.getStressLevel() != null ? l.getStressLevel() : "").append(",")
               .append(l.getWorkload() != null ? l.getWorkload() : "").append(",")
               .append(l.getDietQuality() != null ? l.getDietQuality() : "").append(",")
               .append(l.getCaffeineIntake() != null ? l.getCaffeineIntake() : "").append(",")
               .append(l.getAlcoholIntake() != null ? l.getAlcoholIntake() : "").append(",")
               .append(l.getEnergyLevel() != null ? l.getEnergyLevel() : "").append("\n");
        }

        byte[] content = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=period_tracker_report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(content.length)
                .body(content);
    }
}
