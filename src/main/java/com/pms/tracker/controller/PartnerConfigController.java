package com.pms.tracker.controller;

import com.pms.tracker.model.PartnerConfig;
import com.pms.tracker.model.User;
import com.pms.tracker.service.PartnerConfigService;
import com.pms.tracker.service.PartnerNotificationService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@RestController
@RequestMapping("/api/partner")
public class PartnerConfigController {

    private final PartnerConfigService partnerConfigService;
    private final PartnerNotificationService partnerNotificationService;

    @Autowired
    private HttpSession session;

    @Autowired
    public PartnerConfigController(PartnerConfigService partnerConfigService,
                                   PartnerNotificationService partnerNotificationService) {
        this.partnerConfigService = partnerConfigService;
        this.partnerNotificationService = partnerNotificationService;
    }

    private User getLoggedInUser() {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not logged in");
        }
        return user;
    }

    @GetMapping("/config")
    public ResponseEntity<PartnerConfig> getConfig() {
        User user = getLoggedInUser();
        Optional<PartnerConfig> config = partnerConfigService.getConfigByUserId(user.getId());
        return config.map(ResponseEntity::ok)
                     .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/config")
    public ResponseEntity<?> createOrUpdate(@RequestBody PartnerConfig request) {
        try {
            User user = getLoggedInUser();
            
            // 1. Basic validation of email
            String email = request.getPartnerEmail();
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body("❌ Invalid Email Address");
            }
            if (!email.matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) {
                return ResponseEntity.badRequest().body("❌ Invalid Email Address");
            }

            // 2. Check if we have an existing configuration
            Optional<PartnerConfig> existingOpt = partnerConfigService.getConfigByUserId(user.getId());
            boolean isUpdate = existingOpt.isPresent();
            String originalEmail = isUpdate ? existingOpt.get().getPartnerEmail() : null;
            boolean originalEnabled = isUpdate && existingOpt.get().isEnabled();

            // 3. Prepare partner config
            PartnerConfig config = new PartnerConfig();
            config.setUserId(user.getId());
            config.setPartnerEmail(email);
            config.setEnabled(false); // Enable ONLY if test notification succeeds!

            // 4. Save draft to get/generate details
            config = partnerConfigService.createOrUpdateConfig(config);

            // 5. Send test notification
            String testResult = partnerNotificationService.sendTestNotification(config);

            if ("SUCCESS".equals(testResult)) {
                // Test notification succeeded! Mark enabled
                config.setEnabled(true);
                PartnerConfig saved = partnerConfigService.createOrUpdateConfig(config);
                
                // Trigger "Partner Mode Enabled" event update immediately
                try {
                    java.util.Map<String, Object> summary = partnerConfigService.getCompactSummary(saved.getId());
                    partnerNotificationService.sendEventUpdate(saved, user.getUsername(), "Partner Mode Enabled", summary);
                } catch (Exception e) {
                    // Ignore errors from initial event dispatching
                }
                return ResponseEntity.ok(saved);
            } else {
                if (isUpdate) {
                    // Revert existing configuration back to its original valid state
                    PartnerConfig revertConfig = existingOpt.get();
                    revertConfig.setPartnerEmail(originalEmail);
                    revertConfig.setEnabled(originalEnabled);
                    partnerConfigService.createOrUpdateConfig(revertConfig);
                } else {
                    // Remove the configuration draft if it was new and test failed
                    partnerConfigService.deleteConfig(config.getId(), user.getId());
                }

                if (testResult.startsWith("SMTP_ERROR")) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body("❌ SMTP Configuration Error: " + testResult);
                } else {
                    return ResponseEntity.badRequest().body("❌ Invalid Email Address: " + testResult);
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            t.printStackTrace(pw);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("❌ Unexpected Server Error: " + t.getMessage() + "\nStacktrace:\n" + sw.toString());
        }
    }

    @DeleteMapping("/config/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        User user = getLoggedInUser();
        partnerConfigService.deleteConfig(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
