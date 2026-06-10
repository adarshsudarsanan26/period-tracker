package com.pms.tracker.repository;

import com.pms.tracker.model.LifestyleLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LifestyleLogRepository extends JpaRepository<LifestyleLog, Long> {
    Optional<LifestyleLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
    List<LifestyleLog> findByUserIdOrderByLogDateAsc(Long userId);
    void deleteByUserIdAndLogDate(Long userId, LocalDate logDate);
}
