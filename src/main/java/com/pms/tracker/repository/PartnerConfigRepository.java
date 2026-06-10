package com.pms.tracker.repository;

import com.pms.tracker.model.PartnerConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerConfigRepository extends JpaRepository<PartnerConfig, Long> {
    List<PartnerConfig> findByUserId(Long userId);
    Optional<PartnerConfig> findByDashboardToken(String token);
}
