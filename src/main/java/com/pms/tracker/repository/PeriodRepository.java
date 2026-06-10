package com.pms.tracker.repository;

import com.pms.tracker.model.Period;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PeriodRepository extends JpaRepository<Period, Long> {
    List<Period> findByUserIdOrderByStartDateAsc(Long userId);
    List<Period> findByUserIdOrderByStartDateDesc(Long userId);
}
