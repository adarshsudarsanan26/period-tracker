package com.pms.tracker.repository;

import com.pms.tracker.model.Mood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MoodRepository extends JpaRepository<Mood, Long> {
    List<Mood> findByUserIdOrderByMoodDateAsc(Long userId);
    List<Mood> findByUserIdOrderByMoodDateDesc(Long userId);
    List<Mood> findByUserIdAndMoodDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
    Optional<Mood> findByUserIdAndMoodDate(Long userId, LocalDate moodDate);
}
