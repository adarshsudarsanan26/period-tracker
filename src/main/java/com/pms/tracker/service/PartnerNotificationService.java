package com.pms.tracker.service;

import com.pms.tracker.model.PartnerConfig;
import com.pms.tracker.model.PartnerNotification;
import com.pms.tracker.repository.PartnerNotificationRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class PartnerNotificationService {

    private final JavaMailSender mailSender;
    private final Environment env;
    private final PartnerNotificationRepository notificationRepository;

    @Autowired
    public PartnerNotificationService(JavaMailSender mailSender,
                                     Environment env,
                                     PartnerNotificationRepository notificationRepository) {
        this.mailSender = mailSender;
        this.env = env;
        this.notificationRepository = notificationRepository;
    }

    /**
     * Sends a test email notification using the partner configuration.
     * Returns a status string (e.g. "SUCCESS", "SMTP_ERROR: error details", or syntax validation error).
     */
    public String sendTestNotification(PartnerConfig config) {
        String to = config.getPartnerEmail();
        if (to == null || to.isBlank()) {
            return "No email address configured.";
        }
        String smtpUser = env.getProperty("spring.mail.username");
        String smtpPass = env.getProperty("spring.mail.password");
        if (smtpUser == null || smtpPass == null || smtpUser.isBlank() || smtpPass.isBlank()) {
            return "SMTP_ERROR: Credentials not configured in environment variables.";
        }
        if ("mock@example.com".equalsIgnoreCase(smtpUser)) {
            PartnerNotification notif = new PartnerNotification();
            notif.setPartnerConfig(config);
            notif.setEventType("TEST_NOTIFICATION");
            notif.setStatus("SUCCESS");
            notif.setMessage("MOCK: Test email successfully bypassed for " + to);
            notif.setTimestamp(LocalDateTime.now());
            notificationRepository.save(notif);
            return "SUCCESS";
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(smtpUser);
            helper.setTo(to);
            helper.setSubject("LunaFlow 👥 Partner Mode Connected");
            
            String htmlContent = getTestEmailHtml();
            helper.setText(htmlContent, true);
            
            mailSender.send(message);

            // Record success
            PartnerNotification notif = new PartnerNotification();
            notif.setPartnerConfig(config);
            notif.setEventType("TEST_NOTIFICATION");
            notif.setStatus("SUCCESS");
            notif.setMessage("Test email sent successfully to " + to);
            notif.setTimestamp(LocalDateTime.now());
            notificationRepository.save(notif);
            
            return "SUCCESS";
        } catch (Exception e) {
            // Record failure
            PartnerNotification notif = new PartnerNotification();
            notif.setPartnerConfig(config);
            notif.setEventType("TEST_NOTIFICATION");
            notif.setStatus("FAILURE");
            notif.setMessage(e.getMessage());
            notif.setTimestamp(LocalDateTime.now());
            notificationRepository.save(notif);
            
            return "SMTP_ERROR: " + e.getMessage();
        }
    }

    /**
     * Sends a visual card email update to the partner.
     */
    public void sendEventUpdate(PartnerConfig config, String senderEmail, String eventTitle, Map<String, Object> summary) {
        if (!config.isEnabled()) return;
        
        String to = config.getPartnerEmail();
        if (to == null || to.isBlank()) return;
        
        String smtpUser = env.getProperty("spring.mail.username");
        String smtpPass = env.getProperty("spring.mail.password");
        if (smtpUser == null || smtpPass == null || smtpUser.isBlank() || smtpPass.isBlank()) {
            return;
        }
        if ("mock@example.com".equalsIgnoreCase(smtpUser)) {
            PartnerNotification notif = new PartnerNotification(config, eventTitle, "SUCCESS", "MOCK: Visual card update successfully bypassed for " + to);
            notificationRepository.save(notif);
            return;
        }
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(smtpUser);
            helper.setTo(to);
            helper.setSubject("LunaFlow Update: " + eventTitle);
            
            String htmlContent = getEventEmailHtml(eventTitle, senderEmail, summary);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            
            // Record success
            PartnerNotification notif = new PartnerNotification(config, eventTitle, "SUCCESS", "Visual card update sent successfully to " + to);
            notificationRepository.save(notif);
        } catch (Exception e) {
            // Record failure
            PartnerNotification notif = new PartnerNotification(config, eventTitle, "FAILURE", "Failed to send: " + e.getMessage());
            notificationRepository.save(notif);
        }
    }

    private String getTestEmailHtml() {
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "<meta charset=\"utf-8\">\n" +
                "<style>\n" +
                "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0b0f; color: #e2e2e9; margin: 0; padding: 0; }\n" +
                ".card { max-width: 500px; margin: 40px auto; background: linear-gradient(135deg, #161622 0%, #0d0d14 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }\n" +
                ".badge { background: rgba(43, 203, 186, 0.15); color: #2bcbba; font-size: 12px; font-weight: bold; text-transform: uppercase; padding: 6px 16px; border-radius: 20px; display: inline-block; margin-bottom: 20px; letter-spacing: 1.5px; }\n" +
                "h1 { font-size: 24px; color: #ffffff; margin: 10px 0; font-weight: 600; }\n" +
                "p { font-size: 15px; color: #a1a1b2; line-height: 1.6; margin: 16px 0 24px; }\n" +
                ".footer { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; font-size: 12px; color: #62627a; }\n" +
                "</style>\n" +
                "</head>\n" +
                "<body>\n" +
                "<div class=\"card\">\n" +
                "  <div class=\"badge\">Connection Successful</div>\n" +
                "  <h1>LunaFlow Partner Mode Connected</h1>\n" +
                "  <p>Hello! This is a test notification confirming that you have successfully connected to your partner's LunaFlow account. You will now receive visual updates about their cycle phases, moods, energy, and ways you can offer support.</p>\n" +
                "  <div class=\"footer\">LunaFlow Period Tracker • Premium Insights</div>\n" +
                "</div>\n" +
                "</body>\n" +
                "</html>";
    }

    private String getEventEmailHtml(String eventTitle, String senderEmail, Map<String, Object> summary) {
        String phase = (String) summary.getOrDefault("phase", "MENSTRUAL");
        String phaseLabel = "🌙 " + phase.substring(0, 1) + phase.substring(1).toLowerCase() + " Phase";
        if (phase.equals("OVULATION")) phaseLabel = "☀️ Ovulation Phase";
        else if (phase.equals("FOLLICULAR")) phaseLabel = "🌱 Follicular Phase";
        else if (phase.equals("MENSTRUAL")) phaseLabel = "🩸 Menstrual Phase";
        else if (phase.equals("LUTEAL")) phaseLabel = "🌙 Luteal Phase";

        String moodEmoji = (String) summary.getOrDefault("moodEmoji", "😌");
        String currentMood = (String) summary.getOrDefault("mood", "Calm");
        String energy = (String) summary.getOrDefault("energy", "Medium Energy");
        String wellness = (String) summary.getOrDefault("wellness", "Moderate");
        String suggestion = (String) summary.getOrDefault("suggestion", "Patience and reassurance");
        String avatarState = (String) summary.getOrDefault("avatarState", "calm");

        // Set colors based on avatar mood state
        String avatarBg = "#3730a3";
        String glowColor = "rgba(161, 86, 209, 0.4)";
        if (avatarState.equals("happy")) {
            avatarBg = "#115e59"; glowColor = "rgba(43, 203, 186, 0.4)";
        } else if (avatarState.equals("sensitive")) {
            avatarBg = "#881337"; glowColor = "rgba(255, 117, 140, 0.4)";
        } else if (avatarState.equals("tired")) {
            avatarBg = "#78350f"; glowColor = "rgba(247, 183, 49, 0.4)";
        } else if (avatarState.equals("irritated")) {
            avatarBg = "#991b1b"; glowColor = "rgba(250, 130, 49, 0.4)";
        } else if (avatarState.equals("needs_support")) {
            avatarBg = "#581c87"; glowColor = "rgba(224, 86, 253, 0.4)";
        } else if (avatarState.equals("needs_space")) {
            avatarBg = "#3f3f46"; glowColor = "rgba(141, 133, 157, 0.3)";
        } else if (avatarState.equals("anxious")) {
            avatarBg = "#065f46"; glowColor = "rgba(52, 211, 153, 0.4)";
        } else if (avatarState.equals("energetic")) {
            avatarBg = "#854d0e"; glowColor = "rgba(255, 191, 0, 0.5)";
        }

        String template = "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "<meta charset=\"utf-8\">\n" +
                "<style>\n" +
                "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0b0f; color: #e2e2e9; margin: 0; padding: 0; }\n" +
                ".card { max-width: 450px; margin: 30px auto; background: linear-gradient(135deg, #181824 0%, #0d0d15 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 28px; box-shadow: 0 12px 35px rgba(0,0,0,0.6); }\n" +
                ".header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 20px; margin-bottom: 24px; }\n" +
                ".badge { background: rgba(161, 140, 209, 0.15); color: #a18cd1; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 5px 12px; border-radius: 12px; display: inline-block; letter-spacing: 1px; }\n" +
                ".event-title { font-size: 20px; color: #ffffff; font-weight: 600; margin: 10px 0 5px; }\n" +
                ".sender-info { font-size: 13px; color: #787893; }\n" +
                ".avatar-container { text-align: center; margin: 24px 0; }\n" +
                ".avatar-orb { width: 90px; height: 90px; border-radius: 50%; display: inline-block; line-height: 90px; font-size: 44px; text-align: center; position: relative; border: 2px solid rgba(255, 255, 255, 0.15); }\n" +
                ".details { background: rgba(255,255,255,0.02); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.04); margin-bottom: 24px; }\n" +
                ".detail-item { display: flex; align-items: center; margin-bottom: 14px; font-size: 15px; }\n" +
                ".detail-item:last-child { margin-bottom: 0; }\n" +
                ".icon { font-size: 18px; margin-right: 12px; width: 24px; text-align: center; }\n" +
                ".label { color: #8f8fbc; font-size: 14px; width: 140px; }\n" +
                ".value { color: #ffffff; font-weight: 500; }\n" +
                ".suggestion-box { background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 0 12px 12px 0; font-size: 14px; line-height: 1.5; color: #fecaca; }\n" +
                ".suggestion-title { font-weight: bold; color: #f87171; margin-bottom: 4px; }\n" +
                ".footer { text-align: center; font-size: 12px; color: #5c5c75; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 18px; margin-top: 24px; }\n" +
                "</style>\n" +
                "</head>\n" +
                "<body>\n" +
                "<div class=\"card\">\n" +
                "  <div class=\"header\">\n" +
                "    <div class=\"badge\">LunaFlow Update</div>\n" +
                "    <div class=\"event-title\">" + eventTitle + "</div>\n" +
                "    <div class=\"sender-info\">On behalf of: " + senderEmail + "</div>\n" +
                "  </div>\n" +
                "  \n" +
                "  <div class=\"avatar-container\">\n" +
                "    <div class=\"avatar-orb\" style=\"background: " + avatarBg + "; box-shadow: 0 0 30px " + glowColor + ";\">" + moodEmoji + "</div>\n" +
                "  </div>\n" +
                "  \n" +
                "  <div class=\"details\">\n" +
                "    <div class=\"detail-item\">\n" +
                "      <span class=\"icon\">📅</span>\n" +
                "      <span class=\"label\">Current Phase</span>\n" +
                "      <span class=\"value\">" + phaseLabel + "</span>\n" +
                "    </div>\n" +
                "    <div class=\"detail-item\">\n" +
                "      <span class=\"icon\">" + moodEmoji + "</span>\n" +
                "      <span class=\"label\">Current Mood</span>\n" +
                "      <span class=\"value\">" + currentMood + "</span>\n" +
                "    </div>\n" +
                "    <div class=\"detail-item\">\n" +
                "      <span class=\"icon\">⚡</span>\n" +
                "      <span class=\"label\">Energy Indicator</span>\n" +
                "      <span class=\"value\">" + energy + "</span>\n" +
                "    </div>\n" +
                "    <div class=\"detail-item\">\n" +
                "      <span class=\"icon\">🟡</span>\n" +
                "      <span class=\"label\">Wellness Indicator</span>\n" +
                "      <span class=\"value\">" + wellness + "</span>\n" +
                "    </div>\n" +
                "  </div>\n" +
                "  \n" +
                "  <div class=\"suggestion-box\">\n" +
                "    <div class=\"suggestion-title\">❤️ Suggested Support</div>\n" +
                "    <div>" + suggestion + "</div>\n" +
                "  </div>\n" +
                "  \n" +
                "  <div class=\"footer\">\n" +
                "    LunaFlow Period Tracker • Connection Dashboard\n" +
                "  </div>\n" +
                "</div>\n" +
                "</body>\n" +
                "</html>";

        return template;
    }
}
