package com.pms.tracker.controller;

import com.pms.tracker.dto.PredictionResponse;
import com.pms.tracker.model.Period;
import com.pms.tracker.model.User;
import com.pms.tracker.model.Mood;
import com.pms.tracker.model.Symptom;
import com.pms.tracker.model.LifestyleLog;
import com.pms.tracker.repository.PeriodRepository;
import com.pms.tracker.repository.MoodRepository;
import com.pms.tracker.repository.SymptomRepository;
import com.pms.tracker.repository.LifestyleLogRepository;
import com.pms.tracker.service.PredictionEngine;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    @Autowired
    private PredictionEngine predictionEngine;

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

    @GetMapping
    public ResponseEntity<PredictionResponse> getPredictions() {
        User user = getLoggedInUser();
        Long userId = user.getId();
        
        List<Period> periods = periodRepository.findByUserIdOrderByStartDateAsc(userId);
        List<Mood> moods = moodRepository.findByUserIdOrderByMoodDateAsc(userId);
        List<Symptom> symptoms = symptomRepository.findByUserIdOrderBySymptomDateAsc(userId);
        List<LifestyleLog> lifestyles = lifestyleLogRepository.findByUserIdOrderByLogDateAsc(userId);
        
        PredictionResponse predictions = predictionEngine.calculatePredictions(user, periods, moods, symptoms, lifestyles);
        return ResponseEntity.ok(predictions);
    }
}
