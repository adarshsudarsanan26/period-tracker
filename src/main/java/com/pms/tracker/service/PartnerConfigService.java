package com.pms.tracker.service;

import com.pms.tracker.model.*;
import com.pms.tracker.repository.*;
import com.pms.tracker.dto.PredictionResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class PartnerConfigService {

    private final PartnerConfigRepository partnerConfigRepository;
    private final PartnerNotificationRepository partnerNotificationRepository;
    private final UserRepository userRepository;
    private final PeriodRepository periodRepository;
    private final MoodRepository moodRepository;
    private final SymptomRepository symptomRepository;
    private final LifestyleLogRepository lifestyleLogRepository;
    private final PredictionEngine predictionEngine;

    @Autowired
    public PartnerConfigService(PartnerConfigRepository partnerConfigRepository,
                                PartnerNotificationRepository partnerNotificationRepository,
                                UserRepository userRepository,
                                PeriodRepository periodRepository,
                                MoodRepository moodRepository,
                                SymptomRepository symptomRepository,
                                LifestyleLogRepository lifestyleLogRepository,
                                PredictionEngine predictionEngine) {
        this.partnerConfigRepository = partnerConfigRepository;
        this.partnerNotificationRepository = partnerNotificationRepository;
        this.userRepository = userRepository;
        this.periodRepository = periodRepository;
        this.moodRepository = moodRepository;
        this.symptomRepository = symptomRepository;
        this.lifestyleLogRepository = lifestyleLogRepository;
        this.predictionEngine = predictionEngine;
    }

    public List<PartnerConfig> getConfigsForUser(Long userId) {
        return partnerConfigRepository.findByUserId(userId);
    }

    public Optional<PartnerConfig> getConfigByUserId(Long userId) {
        return partnerConfigRepository.findByUserId(userId).stream().findFirst();
    }

    @Transactional
    public PartnerConfig createOrUpdateConfig(PartnerConfig config) {
        if (config.getPartnerEmail() == null || config.getPartnerEmail().isBlank()) {
            throw new IllegalArgumentException("Partner email must be specified");
        }
        if (!config.getPartnerEmail().matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        
        // Ensure only one config per user
        Optional<PartnerConfig> existing = getConfigByUserId(config.getUserId());
        if (existing.isPresent()) {
            PartnerConfig existingConfig = existing.get();
            existingConfig.setPartnerEmail(config.getPartnerEmail());
            existingConfig.setEnabled(config.isEnabled());
            existingConfig.setUpdatedAt(java.time.LocalDateTime.now());
            if (config.getDashboardToken() != null && !config.getDashboardToken().isBlank()) {
                existingConfig.setDashboardToken(config.getDashboardToken());
            }
            return partnerConfigRepository.save(existingConfig);
        }

        // Generate dashboard token if not present
        if (config.getDashboardToken() == null || config.getDashboardToken().isBlank()) {
            config.setDashboardToken(UUID.randomUUID().toString());
        }
        config.setCreatedAt(java.time.LocalDateTime.now());
        config.setUpdatedAt(java.time.LocalDateTime.now());
        return partnerConfigRepository.save(config);
    }

    @Transactional
    public void deleteConfig(Long configId, Long userId) {
        Optional<PartnerConfig> opt = partnerConfigRepository.findById(configId);
        if (opt.isPresent() && opt.get().getUserId().equals(userId)) {
            // Delete child notifications first to avoid FK constraint violation
            partnerNotificationRepository.deleteByPartnerConfigId(configId);
            partnerConfigRepository.deleteById(configId);
        } else {
            throw new IllegalArgumentException("Config not found or unauthorized");
        }
    }

    public Optional<PartnerConfig> getConfigByDashboardToken(String token) {
        return partnerConfigRepository.findByDashboardToken(token);
    }

    // Method for dashboard status summary
    public java.util.Map<String, Object> getCompactSummary(Long configId) {
        PartnerConfig config = partnerConfigRepository.findById(configId)
                .orElseThrow(() -> new IllegalArgumentException("Config not found"));
        
        Long userId = config.getUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Period> periods = periodRepository.findByUserIdOrderByStartDateAsc(userId);
        List<Mood> moods = moodRepository.findByUserIdOrderByMoodDateAsc(userId);
        List<Symptom> symptoms = symptomRepository.findByUserIdOrderBySymptomDateAsc(userId);
        List<LifestyleLog> lifestyles = lifestyleLogRepository.findByUserIdOrderByLogDateAsc(userId);
        
        PredictionResponse predictions = predictionEngine.calculatePredictions(user, periods, moods, symptoms, lifestyles);
        
        // Find today's metrics
        LocalDate today = LocalDate.now();
        Optional<Mood> todayMoodOpt = moodRepository.findByUserIdAndMoodDate(userId, today);
        List<Symptom> todaySymptoms = symptomRepository.findByUserIdAndSymptomDate(userId, today);
        Optional<LifestyleLog> todayLifeOpt = lifestyleLogRepository.findByUserIdAndLogDate(userId, today);

        String activePhase = predictions.getCurrentPhase();
        
        // Determine Mood
        String moodText = "Calm";
        String moodEmoji = "😌";
        if (todayMoodOpt.isPresent()) {
            String loggedMood = todayMoodOpt.get().getMood();
            if (loggedMood != null && !loggedMood.isBlank()) {
                moodEmoji = loggedMood;
                switch (loggedMood) {
                    case "😊": moodText = "Happy"; break;
                    case "😐": moodText = "Normal"; break;
                    case "😴": moodText = "Tired"; break;
                    case "🤐": moodText = "Silent"; break;
                    case "😔": moodText = "Sad"; break;
                    case "😡": moodText = "Angry"; break;
                    default: moodText = "Calm"; break;
                }
            }
        }

        // Determine Energy
        int energyVal = 3;
        if (todayLifeOpt.isPresent() && todayLifeOpt.get().getEnergyLevel() != null) {
            energyVal = todayLifeOpt.get().getEnergyLevel();
        }
        String energyText = "Medium Energy";
        if (energyVal <= 2) {
            energyText = "Low Energy";
        } else if (energyVal >= 4) {
            energyText = "High Energy";
        }

        // Determine Wellness
        int stressVal = 3;
        if (todayLifeOpt.isPresent() && todayLifeOpt.get().getStressLevel() != null) {
            stressVal = todayLifeOpt.get().getStressLevel();
        }
        
        boolean hasSevereSymptoms = todaySymptoms.stream().anyMatch(s -> 
            s.getSymptom().equalsIgnoreCase("Cramps") || 
            s.getSymptom().equalsIgnoreCase("Pelvic pain") || 
            s.getSymptom().equalsIgnoreCase("Migraine") ||
            s.getSymptom().equalsIgnoreCase("Headache")
        );

        String wellnessText = "Moderate";
        if (hasSevereSymptoms || stressVal >= 4) {
            wellnessText = "Low";
        } else if (todaySymptoms.isEmpty() && stressVal <= 2 && energyVal >= 4) {
            wellnessText = "High";
        }

        // Determine Support Suggestion
        String suggestion = "Patience and reassurance";
        if (hasSevereSymptoms) {
            suggestion = "Provide physical comfort: a warm heating pad, tea, and handle chores.";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Irritability") || s.getSymptom().equalsIgnoreCase("Anger") || s.getSymptom().equalsIgnoreCase("Frustration"))) {
            suggestion = "Be patient, listen without debating, and give her gentle space.";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Need for space") || s.getSymptom().equalsIgnoreCase("Silent behavior") || s.getSymptom().equalsIgnoreCase("Avoiding people"))) {
            suggestion = "Respect her boundary and give her quiet space to recharge.";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Need for comfort") || s.getSymptom().equalsIgnoreCase("Need for affection") || s.getSymptom().equalsIgnoreCase("Need for reassurance") || s.getSymptom().equalsIgnoreCase("Emotional sensitivity") || s.getSymptom().equalsIgnoreCase("Crying easily"))) {
            suggestion = "Offer extra tenderness, validation, and a warm hug.";
        } else if (activePhase.equals("MENSTRUAL")) {
            suggestion = "Support her rest and help keep her physical workload low.";
        } else if (activePhase.equals("FOLLICULAR") || activePhase.equals("OVULATION")) {
            suggestion = "Plan a fun date night or tackle an outdoor project together!";
        } else if (activePhase.equals("LUTEAL")) {
            suggestion = "Patience, gentle reassurance, and comfort.";
        }

        // Determine Avatar State
        String avatarState = "calm";
        if (todayMoodOpt.isPresent() && todayMoodOpt.get().getMood().equals("😊")) {
            avatarState = "happy";
        } else if (todayMoodOpt.isPresent() && todayMoodOpt.get().getMood().equals("😴")) {
            avatarState = "tired";
        } else if (todayMoodOpt.isPresent() && todayMoodOpt.get().getMood().equals("😡")) {
            avatarState = "irritated";
        } else if (todayMoodOpt.isPresent() && todayMoodOpt.get().getMood().equals("🤐")) {
            avatarState = "needs_space";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Irritability") || s.getSymptom().equalsIgnoreCase("Anger") || s.getSymptom().equalsIgnoreCase("Frustration"))) {
            avatarState = "irritated";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Need for space") || s.getSymptom().equalsIgnoreCase("Silent behavior") || s.getSymptom().equalsIgnoreCase("Avoiding people"))) {
            avatarState = "needs_space";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Anxiety") || s.getSymptom().equalsIgnoreCase("Overthinking") || s.getSymptom().equalsIgnoreCase("Racing thoughts"))) {
            avatarState = "anxious";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Need for comfort") || s.getSymptom().equalsIgnoreCase("Need for affection") || s.getSymptom().equalsIgnoreCase("Need for reassurance") || s.getSymptom().equalsIgnoreCase("Feeling unsupported"))) {
            avatarState = "needs_support";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Emotional sensitivity") || s.getSymptom().equalsIgnoreCase("Crying easily") || s.getSymptom().equalsIgnoreCase("Feeling insecure"))) {
            avatarState = "sensitive";
        } else if (todaySymptoms.stream().anyMatch(s -> s.getSymptom().equalsIgnoreCase("Fatigue") || s.getSymptom().equalsIgnoreCase("Sleepiness") || s.getSymptom().equalsIgnoreCase("Insomnia") || s.getSymptom().equalsIgnoreCase("Mental fatigue")) || energyVal <= 2) {
            avatarState = "tired";
        } else if (energyVal >= 5) {
            avatarState = "energetic";
        } else if (activePhase.equals("OVULATION") && todaySymptoms.isEmpty()) {
            avatarState = "happy";
        }

        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("partnerEmail", config.getPartnerEmail());
        map.put("partnerName", "Partner");
        map.put("userName", user.getName());
        map.put("phase", activePhase);
        map.put("mood", moodText);
        map.put("moodEmoji", moodEmoji);
        map.put("energy", energyText);
        map.put("wellness", wellnessText);
        map.put("suggestion", suggestion);
        map.put("avatarState", avatarState);
        map.put("currentDay", predictions.getCurrentCycleDay());
        map.put("totalDays", predictions.getAvgCycleLength());
        map.put("daysRemaining", predictions.getDaysRemaining());
        map.put("pmsStatus", predictions.getPmsStatus());
        return map;
    }
}
