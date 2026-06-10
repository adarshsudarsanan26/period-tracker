package com.pms.tracker;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import com.pms.tracker.dto.PredictionResponse;
import com.pms.tracker.model.Period;
import com.pms.tracker.model.User;
import com.pms.tracker.model.Mood;
import com.pms.tracker.model.Symptom;
import com.pms.tracker.model.LifestyleLog;
import com.pms.tracker.service.PredictionEngine;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.pms.tracker.model.Period;
import com.pms.tracker.model.User;
import com.pms.tracker.model.Mood;
import com.pms.tracker.model.Symptom;
import com.pms.tracker.model.LifestyleLog;
import com.pms.tracker.service.PredictionEngine;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PredictionEngineTests {

    private final PredictionEngine predictionEngine = new PredictionEngine();

    @Test
    void testCalculatePredictionsWithNoData() {
        User user = new User("adarsh", "hash", "Adarsh", 28, 5);
        List<Period> periods = Arrays.asList();
        List<Mood> moods = Arrays.asList();
        List<Symptom> symptoms = Arrays.asList();
        List<LifestyleLog> lifestyles = Arrays.asList();

        PredictionResponse response = predictionEngine.calculatePredictions(user, periods, moods, symptoms, lifestyles);

        assertEquals("NO_DATA", response.getPmsStatus());
        assertEquals(28, response.getAvgCycleLength());
        assertEquals(5, response.getAvgPeriodDuration());
        assertNull(response.getNextPeriodStartDate());
        assertTrue(response.getAiPatterns().get(0).contains("Log your cycle start dates"));
    }

    @Test
    void testCalculatePredictionsWithAIInsights() {
        User user = new User("adarsh", "hash", "Adarsh", 28, 5);
        user.setId(1L);
        
        // 1. Setup periods: March 10, April 7, May 5
        Period p1 = new Period(user, LocalDate.of(2026, 3, 10), LocalDate.of(2026, 3, 14));
        Period p2 = new Period(user, LocalDate.of(2026, 4, 7), LocalDate.of(2026, 4, 11));
        Period p3 = new Period(user, LocalDate.of(2026, 5, 5), LocalDate.of(2026, 5, 9));
        List<Period> periods = Arrays.asList(p1, p2, p3);

        // 2. Setup short sleep days and irritability moods/symptoms
        // Short sleep days: May 1 (5h sleep), May 29 (4.5h sleep) -> irritable
        LifestyleLog l1 = new LifestyleLog(user, LocalDate.of(2026, 5, 1));
        l1.setSleepDuration(5.0);
        LifestyleLog l2 = new LifestyleLog(user, LocalDate.of(2026, 5, 29));
        l2.setSleepDuration(4.5);

        // Normal sleep days: May 2 (8h sleep), May 30 (7.5h sleep) -> happy
        LifestyleLog l3 = new LifestyleLog(user, LocalDate.of(2026, 5, 2));
        l3.setSleepDuration(8.0);
        LifestyleLog l4 = new LifestyleLog(user, LocalDate.of(2026, 5, 30));
        l4.setSleepDuration(7.5);
        List<LifestyleLog> lifestyles = Arrays.asList(l1, l2, l3, l4);

        // Symptoms & Moods
        Mood m1 = new Mood(user, LocalDate.of(2026, 5, 1), "😡", "Irritable");
        Mood m2 = new Mood(user, LocalDate.of(2026, 5, 29), "🤐", "Silent");
        Mood m3 = new Mood(user, LocalDate.of(2026, 5, 2), "😊", "Happy");
        Mood m4 = new Mood(user, LocalDate.of(2026, 5, 30), "😊", "Happy");
        List<Mood> moods = Arrays.asList(m1, m2, m3, m4);

        // Seed "Anger" 4 days before next periods (next period starts were Apr 7, May 5, Jun 2)
        // 4 days before May 5 is May 1. 4 days before Jun 2 is May 29.
        Symptom s1 = new Symptom(user, LocalDate.of(2026, 5, 1), "Anger");
        Symptom s2 = new Symptom(user, LocalDate.of(2026, 5, 29), "Anger");

        // Seed "Crying easily" in Luteal Phase (cycle days 22-28)
        // May cycle start was May 5. Luteal phase days (22 to 28) corresponds to May 26 to June 1.
        // Let's seed crying on May 27 and May 28.
        Symptom s3 = new Symptom(user, LocalDate.of(2026, 5, 27), "Crying easily");
        Symptom s4 = new Symptom(user, LocalDate.of(2026, 5, 28), "Crying easily");
        List<Symptom> symptoms = Arrays.asList(s1, s2, s3, s4);

        PredictionResponse response = predictionEngine.calculatePredictions(user, periods, moods, symptoms, lifestyles);

        // Core assertions
        assertEquals(28, response.getAvgCycleLength());
        assertEquals(5, response.getAvgPeriodDuration());
        assertEquals(LocalDate.of(2026, 6, 2), response.getNextPeriodStartDate());

        // AI Insight patterns assertions
        List<String> patterns = response.getAiPatterns();
        assertFalse(patterns.isEmpty(), "AI Patterns should be calculated");
        
        // Check sleep correlation is found
        assertTrue(patterns.stream().anyMatch(p -> p.contains("Sleep deprivation")), "Should contain sleep pattern");
        
        // Check Anger offset pattern is found (May 1 to May 5 is 4 days, May 29 to June 2 is 4 days)
        assertTrue(patterns.stream().anyMatch(p -> p.contains("Anger typically appears 4 days")), "Should detect Anger offset of 4 days");

        // Check Luteal phase crying pattern
        System.out.println("AI PATTERNS DETECTED: " + patterns);
        assertTrue(patterns.stream().anyMatch(p -> p.contains("Crying episodes occur most frequently")), "Should detect luteal phase crying patterns");
    }
}
