package com.pms.tracker.controller;

import com.pms.tracker.model.Period;
import com.pms.tracker.model.User;
import com.pms.tracker.model.PartnerConfig;
import com.pms.tracker.repository.PeriodRepository;
import com.pms.tracker.service.PartnerConfigService;
import com.pms.tracker.service.PartnerNotificationService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/periods")
public class PeriodController {

    @Autowired
    private PeriodRepository periodRepository;

    @Autowired
    private PartnerConfigService partnerConfigService;

    @Autowired
    private PartnerNotificationService partnerNotificationService;

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
    public ResponseEntity<List<Period>> getAllPeriods() {
        User user = getLoggedInUser();
        List<Period> periods = periodRepository.findByUserIdOrderByStartDateDesc(user.getId());
        return ResponseEntity.ok(periods);
    }

    @PostMapping
    public ResponseEntity<Period> createPeriod(@RequestBody Period period) {
        User user = getLoggedInUser();
        period.setUser(user);
        if (period.getEndDate() == null) {
            period.setStatus("ACTIVE");
        } else {
            period.setStatus("COMPLETED");
        }
        Period savedPeriod = periodRepository.save(period);
        
        // Trigger partner notification
        if ("ACTIVE".equals(savedPeriod.getStatus())) {
            try {
                Optional<PartnerConfig> configOpt = partnerConfigService.getConfigByUserId(user.getId());
                if (configOpt.isPresent() && configOpt.get().isEnabled()) {
                    PartnerConfig config = configOpt.get();
                    java.util.Map<String, Object> summary = partnerConfigService.getCompactSummary(config.getId());
                    partnerNotificationService.sendEventUpdate(config, user.getUsername(), "Period Started", summary);
                }
            } catch (Exception e) {
                // ignore
            }
        }
        
        return ResponseEntity.ok(savedPeriod);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Period> updatePeriod(@PathVariable Long id, @RequestBody Period periodDetails) {
        User user = getLoggedInUser();
        Period period = periodRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Period not found"));
        
        if (!period.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        
        boolean wasActive = "ACTIVE".equals(period.getStatus());
        period.setStartDate(periodDetails.getStartDate());
        period.setEndDate(periodDetails.getEndDate());
        if (periodDetails.getEndDate() == null) {
            period.setStatus("ACTIVE");
        } else {
            period.setStatus("COMPLETED");
        }
        Period updatedPeriod = periodRepository.save(period);
        boolean isCompletedNow = "COMPLETED".equals(updatedPeriod.getStatus());

        if (wasActive && isCompletedNow) {
            try {
                Optional<PartnerConfig> configOpt = partnerConfigService.getConfigByUserId(user.getId());
                if (configOpt.isPresent() && configOpt.get().isEnabled()) {
                    PartnerConfig config = configOpt.get();
                    java.util.Map<String, Object> summary = partnerConfigService.getCompactSummary(config.getId());
                    partnerNotificationService.sendEventUpdate(config, user.getUsername(), "Period Ended", summary);
                }
            } catch (Exception e) {
                // ignore
            }
        } else if (!wasActive && "ACTIVE".equals(updatedPeriod.getStatus())) {
            try {
                Optional<PartnerConfig> configOpt = partnerConfigService.getConfigByUserId(user.getId());
                if (configOpt.isPresent() && configOpt.get().isEnabled()) {
                    PartnerConfig config = configOpt.get();
                    java.util.Map<String, Object> summary = partnerConfigService.getCompactSummary(config.getId());
                    partnerNotificationService.sendEventUpdate(config, user.getUsername(), "Period Started", summary);
                }
            } catch (Exception e) {
                // ignore
            }
        }
        
        return ResponseEntity.ok(updatedPeriod);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePeriod(@PathVariable Long id) {
        User user = getLoggedInUser();
        Period period = periodRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Period not found"));
        
        if (!period.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        
        periodRepository.delete(period);
        return ResponseEntity.ok().build();
    }
}
