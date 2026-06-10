package com.pms.tracker.repository;

import com.pms.tracker.model.Symptom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface SymptomRepository extends JpaRepository<Symptom, Long> {
    List<Symptom> findByUserIdOrderBySymptomDateAsc(Long userId);
    List<Symptom> findByUserIdAndSymptomDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
    List<Symptom> findByUserIdAndSymptomDate(Long userId, LocalDate date);
    void deleteByUserIdAndSymptomDate(Long userId, LocalDate date);
}
