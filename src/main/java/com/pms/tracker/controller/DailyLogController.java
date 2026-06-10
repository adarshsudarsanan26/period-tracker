package com.pms.tracker.controller;

import com.pms.tracker.dto.DailyLogDTO;
import com.pms.tracker.model.Mood;
import com.pms.tracker.model.Symptom;
import com.pms.tracker.model.LifestyleLog;
import com.pms.tracker.model.User;
import com.pms.tracker.repository.MoodRepository;
import com.pms.tracker.repository.SymptomRepository;
import com.pms.tracker.repository.LifestyleLogRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.pms.tracker.service.PartnerConfigService;
import com.pms.tracker.service.PartnerNotificationService;
import com.pms.tracker.model.PartnerConfig;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/daily-logs")
public class DailyLogController {

    private static final Logger log = LoggerFactory.getLogger(DailyLogController.class);

    @Autowired
    private MoodRepository moodRepository;

    @Autowired
    private SymptomRepository symptomRepository;

    @Autowired
    private LifestyleLogRepository lifestyleLogRepository;

    @Autowired
    private PartnerConfigService partnerConfigService;

    @Autowired
    private PartnerNotificationService partnerNotificationService;

    @Autowired
    private HttpSession session;

    private User getLoggedInUser() {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not logged in");
        }
        return user;
    }

    @GetMapping
    public ResponseEntity<List<DailyLogDTO>> getAllDailyLogs() {
        User user = getLoggedInUser();
        Long userId = user.getId();

        List<Mood> moods = moodRepository.findByUserIdOrderByMoodDateAsc(userId);
        List<Symptom> symptoms = symptomRepository.findByUserIdOrderBySymptomDateAsc(userId);
        List<LifestyleLog> lifestyles = lifestyleLogRepository.findByUserIdOrderByLogDateAsc(userId);

        Map<LocalDate, DailyLogDTO> logsMap = new TreeMap<>(); // sorted by date

        for (Mood m : moods) {
            logsMap.put(m.getMoodDate(), new DailyLogDTO(m.getMoodDate(), m.getMood(), m.getNotes(), new ArrayList<>()));
        }

        for (Symptom s : symptoms) {
            DailyLogDTO dto = logsMap.computeIfAbsent(s.getSymptomDate(), 
                date -> new DailyLogDTO(date, "", "", new ArrayList<>()));
            dto.getSymptoms().add(s.getSymptom());
        }

        for (LifestyleLog l : lifestyles) {
            DailyLogDTO dto = logsMap.computeIfAbsent(l.getLogDate(),
                date -> new DailyLogDTO(date, "", "", new ArrayList<>()));
            mapLifestyleToDTO(l, dto);
        }

        return ResponseEntity.ok(new ArrayList<>(logsMap.values()));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<DailyLogDTO> getDailyLogByDate(@PathVariable String date) {
        User user = getLoggedInUser();
        Long userId = user.getId();
        LocalDate localDate = LocalDate.parse(date);

        Optional<Mood> moodOpt = moodRepository.findByUserIdAndMoodDate(userId, localDate);
        List<Symptom> symptoms = symptomRepository.findByUserIdAndSymptomDate(userId, localDate);
        Optional<LifestyleLog> lifeOpt = lifestyleLogRepository.findByUserIdAndLogDate(userId, localDate);

        DailyLogDTO dto = new DailyLogDTO();
        dto.setDate(localDate);
        dto.setSymptoms(symptoms.stream().map(Symptom::getSymptom).collect(Collectors.toList()));
        
        if (moodOpt.isPresent()) {
            dto.setMood(moodOpt.get().getMood());
            dto.setNotes(moodOpt.get().getNotes());
        } else {
            dto.setMood("");
            dto.setNotes("");
        }

        lifeOpt.ifPresent(l -> mapLifestyleToDTO(l, dto));

        return ResponseEntity.ok(dto);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<DailyLogDTO> saveDailyLog(@RequestBody DailyLogDTO dto) {
        User user = getLoggedInUser();
        Long userId = user.getId();
        LocalDate logDate = dto.getDate();

        log.info("Received request to save daily log for user id: {}, date: {}", userId, logDate);

        // 1. Save or Delete Mood
        Optional<Mood> existingMood = moodRepository.findByUserIdAndMoodDate(userId, logDate);
        if (dto.getMood() == null || dto.getMood().trim().isEmpty()) {
            existingMood.ifPresent(mood -> {
                log.info("Deleting existing mood log for user id: {}, date: {}", userId, logDate);
                moodRepository.delete(mood);
            });
        } else {
            Mood mood = existingMood.orElse(new Mood());
            mood.setUser(user);
            mood.setMoodDate(logDate);
            mood.setMood(dto.getMood());
            mood.setNotes(dto.getNotes());
            log.info("Saving mood '{}' (notes: '{} characters') for user id: {}, date: {}", dto.getMood(), dto.getNotes() != null ? dto.getNotes().length() : 0, userId, logDate);
            moodRepository.save(mood);
        }

        // 2. Save symptoms (delete existing first, then save new)
        log.info("Clearing existing symptoms for user id: {}, date: {}", userId, logDate);
        symptomRepository.deleteByUserIdAndSymptomDate(userId, logDate);
        if (dto.getSymptoms() != null && !dto.getSymptoms().isEmpty()) {
            log.info("Saving {} symptoms: {} for user id: {}, date: {}", dto.getSymptoms().size(), dto.getSymptoms(), userId, logDate);
            for (String symptomName : dto.getSymptoms()) {
                if (symptomName != null && !symptomName.trim().isEmpty()) {
                    Symptom symptom = new Symptom(user, logDate, symptomName);
                    symptomRepository.save(symptom);
                }
            }
        }

        // 3. Save or Delete Lifestyle log
        Optional<LifestyleLog> existingLife = lifestyleLogRepository.findByUserIdAndLogDate(userId, logDate);
        boolean hasLifestyleData = dto.getSleepQuality() != null || dto.getSleepDuration() != null || 
                                   dto.getWaterIntake() != null || dto.getExerciseDuration() != null || 
                                   dto.getWalkingSteps() != null || dto.getStressLevel() != null || 
                                   dto.getWorkload() != null || dto.getDietQuality() != null || 
                                   dto.getCaffeineIntake() != null || dto.getAlcoholIntake() != null || 
                                   dto.getEnergyLevel() != null;

        if (!hasLifestyleData) {
            existingLife.ifPresent(l -> {
                log.info("Deleting existing lifestyle log for user id: {}, date: {}", userId, logDate);
                lifestyleLogRepository.delete(l);
            });
        } else {
            LifestyleLog life = existingLife.orElse(new LifestyleLog());
            life.setUser(user);
            life.setLogDate(logDate);
            life.setSleepQuality(dto.getSleepQuality());
            life.setSleepDuration(dto.getSleepDuration());
            life.setWaterIntake(dto.getWaterIntake());
            life.setExerciseDuration(dto.getExerciseDuration());
            life.setWalkingSteps(dto.getWalkingSteps());
            life.setStressLevel(dto.getStressLevel());
            life.setWorkload(dto.getWorkload());
            life.setDietQuality(dto.getDietQuality());
            life.setCaffeineIntake(dto.getCaffeineIntake());
            life.setAlcoholIntake(dto.getAlcoholIntake());
            life.setEnergyLevel(dto.getEnergyLevel());
            log.info("Saving lifestyle log details (Sleep: {}h, Water: {}L, Stress: {}/5) for user id: {}, date: {}", dto.getSleepDuration(), dto.getWaterIntake(), dto.getStressLevel(), userId, logDate);
            lifestyleLogRepository.save(life);
        }

        // Trigger partner notifications
        try {
            Optional<PartnerConfig> configOpt = partnerConfigService.getConfigByUserId(userId);
            if (configOpt.isPresent() && configOpt.get().isEnabled()) {
                PartnerConfig config = configOpt.get();
                java.util.Map<String, Object> summary = partnerConfigService.getCompactSummary(config.getId());
                
                // 1. Send Daily Summary
                partnerNotificationService.sendEventUpdate(config, user.getUsername(), "Daily Summary", summary);

                // 2. Check for Significant Mood Change
                String todayMood = dto.getMood();
                if (todayMood != null && !todayMood.isBlank()) {
                    Optional<Mood> prevMoodOpt = moodRepository.findByUserIdOrderByMoodDateDesc(userId).stream()
                            .filter(m -> !m.getMoodDate().equals(logDate))
                            .findFirst();
                    String prevMood = prevMoodOpt.isPresent() ? prevMoodOpt.get().getMood() : "";
                    
                    if (!todayMood.equals(prevMood)) {
                        boolean isSignificant = todayMood.equals("😡") || todayMood.equals("😔") || todayMood.equals("🤐") || todayMood.equals("😴") || todayMood.equals("🥹");
                        if (isSignificant) {
                            partnerNotificationService.sendEventUpdate(config, user.getUsername(), "Significant Mood Change", summary);
                        }
                    }
                }

                // 3. Check for Phase Changed / PMS Started
                String currentPhase = (String) summary.get("phase");
                String lastNotifiedPhase = config.getLastNotifiedPhase();
                if (lastNotifiedPhase == null || !lastNotifiedPhase.equals(currentPhase)) {
                    partnerNotificationService.sendEventUpdate(config, user.getUsername(), "Phase Changed", summary);
                    config.setLastNotifiedPhase(currentPhase);
                    
                    String pmsStatus = (String) summary.get("pmsStatus");
                    if ("PMS_LIKELY".equals(pmsStatus)) {
                        String lastNotifiedPms = config.getLastNotifiedPmsStatus();
                        if (lastNotifiedPms == null || !lastNotifiedPms.equals("PMS_LIKELY")) {
                            partnerNotificationService.sendEventUpdate(config, user.getUsername(), "PMS Started", summary);
                            config.setLastNotifiedPmsStatus("PMS_LIKELY");
                        }
                    } else {
                        config.setLastNotifiedPmsStatus(pmsStatus);
                    }
                    
                    partnerConfigService.createOrUpdateConfig(config);
                }
            }
        } catch (Exception e) {
            log.error("Failed to trigger partner notifications: ", e);
        }

        log.info("Successfully processed daily log for user id: {}, date: {}", userId, logDate);
        return ResponseEntity.ok(dto);
    }

    private void mapLifestyleToDTO(LifestyleLog l, DailyLogDTO dto) {
        dto.setSleepQuality(l.getSleepQuality());
        dto.setSleepDuration(l.getSleepDuration());
        dto.setWaterIntake(l.getWaterIntake());
        dto.setExerciseDuration(l.getExerciseDuration());
        dto.setWalkingSteps(l.getWalkingSteps());
        dto.setStressLevel(l.getStressLevel());
        dto.setWorkload(l.getWorkload());
        dto.setDietQuality(l.getDietQuality());
        dto.setCaffeineIntake(l.getCaffeineIntake());
        dto.setAlcoholIntake(l.getAlcoholIntake());
        dto.setEnergyLevel(l.getEnergyLevel());
    }
}
