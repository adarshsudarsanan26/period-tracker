package com.pms.tracker.repository;

import com.pms.tracker.model.PartnerNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartnerNotificationRepository extends JpaRepository<PartnerNotification, Long> {
    List<PartnerNotification> findByPartnerConfigId(Long partnerConfigId);
    void deleteByPartnerConfigId(Long partnerConfigId);
}
