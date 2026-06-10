package com.pms.tracker.repository;

import com.pms.tracker.model.PartnerNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PartnerNotificationRepository extends JpaRepository<PartnerNotification, Long> {
    List<PartnerNotification> findByPartnerConfigId(Long partnerConfigId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("DELETE FROM PartnerNotification n WHERE n.partnerConfig.id = :partnerConfigId")
    void deleteByPartnerConfigId(@Param("partnerConfigId") Long partnerConfigId);
}
