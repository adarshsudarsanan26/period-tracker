package com.pms.tracker.controller;

import com.pms.tracker.model.PartnerConfig;
import com.pms.tracker.service.PartnerConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@Controller
public class PartnerPublicController {

    private final PartnerConfigService partnerConfigService;

    @Autowired
    public PartnerPublicController(PartnerConfigService partnerConfigService) {
        this.partnerConfigService = partnerConfigService;
    }

    /**
     * Map public path to forward internally to static dashboard view.
     */
    @GetMapping("/partner/dashboard/{token}")
    public String viewDashboard(@PathVariable String token) {
        return "redirect:/?partnerToken=" + token;
    }

    /**
     * Public endpoint that returns the filtered JSON status card summary.
     */
    @GetMapping("/api/partner/public/status")
    @ResponseBody
    public ResponseEntity<?> getPartnerStatus(@RequestParam("token") String token) {
        Optional<PartnerConfig> opt = partnerConfigService.getConfigByDashboardToken(token);
        if (opt.isEmpty()) {
            return ResponseEntity.status(403).body("Invalid token");
        }
        PartnerConfig config = opt.get();
        if (!config.isEnabled()) {
            return ResponseEntity.status(403).body("Partner mode is not enabled");
        }
        try {
            java.util.Map<String, Object> summary = partnerConfigService.getCompactSummary(config.getId());
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error loading dashboard data: " + e.getMessage());
        }
    }
}
