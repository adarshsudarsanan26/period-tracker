package com.pms.tracker.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Centralized transactional email service.
 * Handles password reset emails and any other system-level emails.
 * Uses the same spring.mail.* configuration as PartnerNotificationService.
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final Environment env;

    @Value("${app.base.url:http://localhost:8080}")
    private String appBaseUrl;

    @Autowired
    public EmailService(JavaMailSender mailSender, Environment env) {
        this.mailSender = mailSender;
        this.env = env;
    }

    /**
     * Returns true if real email sending is configured (not mock mode).
     */
    public boolean isEmailConfigured() {
        String smtpUser = env.getProperty("spring.mail.username");
        return smtpUser != null && !smtpUser.isBlank() && !smtpUser.equalsIgnoreCase("mock@example.com");
    }

    /**
     * Sends a password reset email with a secure link.
     * In mock mode, does nothing (the reset token is still valid via the console log).
     *
     * @param toEmail   recipient email address
     * @param resetToken  the UUID reset token
     */
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        if (!isEmailConfigured()) {
            // Mock mode — skip sending; token is logged by caller
            return;
        }

        String resetLink = appBaseUrl + "/?resetToken=" + resetToken;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String smtpUser = env.getProperty("spring.mail.username");
            helper.setFrom(smtpUser);
            helper.setTo(toEmail);
            helper.setSubject("LunaFlow 🔐 Password Reset Request");
            helper.setText(buildPasswordResetHtml(resetLink), true);

            mailSender.send(message);
        } catch (Exception e) {
            // Log but don't expose internals to caller
            System.err.println("[EmailService] Failed to send password reset email to " + toEmail + ": " + e.getMessage());
        }
    }

    private String buildPasswordResetHtml(String resetLink) {
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "<meta charset=\"utf-8\">\n" +
                "<style>\n" +
                "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0b0f; color: #e2e2e9; margin: 0; padding: 0; }\n" +
                ".card { max-width: 480px; margin: 40px auto; background: linear-gradient(135deg, #161622 0%, #0d0d14 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }\n" +
                ".icon { font-size: 48px; margin-bottom: 16px; }\n" +
                ".badge { background: rgba(255, 117, 140, 0.15); color: #ff758c; font-size: 12px; font-weight: bold; text-transform: uppercase; padding: 6px 16px; border-radius: 20px; display: inline-block; margin-bottom: 20px; letter-spacing: 1.5px; }\n" +
                "h1 { font-size: 22px; color: #ffffff; margin: 10px 0; font-weight: 600; }\n" +
                "p { font-size: 15px; color: #a1a1b2; line-height: 1.6; margin: 16px 0 28px; }\n" +
                ".btn { display: inline-block; background: linear-gradient(135deg, #ff758c, #ff7eb3); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; }\n" +
                ".note { font-size: 13px; color: #62627a; margin-top: 24px; }\n" +
                ".footer { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; margin-top: 28px; font-size: 12px; color: #62627a; }\n" +
                "</style>\n" +
                "</head>\n" +
                "<body>\n" +
                "<div class=\"card\">\n" +
                "  <div class=\"icon\">🔐</div>\n" +
                "  <div class=\"badge\">Password Reset</div>\n" +
                "  <h1>Reset your LunaFlow password</h1>\n" +
                "  <p>We received a request to reset your password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.</p>\n" +
                "  <a href=\"" + resetLink + "\" class=\"btn\">Reset Password</a>\n" +
                "  <p class=\"note\">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>\n" +
                "  <div class=\"footer\">LunaFlow Period Tracker • Your data stays private</div>\n" +
                "</div>\n" +
                "</body>\n" +
                "</html>";
    }
}
