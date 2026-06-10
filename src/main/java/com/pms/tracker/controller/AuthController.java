package com.pms.tracker.controller;

import com.pms.tracker.model.User;
import com.pms.tracker.repository.UserRepository;
import com.pms.tracker.service.EmailService;
import com.pms.tracker.util.PasswordHasher;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Value("${app.base.url:http://localhost:8080}")
    private String appBaseUrl;

    public static class LoginRequest {
        public String username;
        public String password;
    }

    public static class RegisterRequest {
        public String username;
        public String password;
        public String name;
    }

    public static class ForgotPasswordRequest {
        public String username;
    }

    public static class ResetPasswordTokenRequest {
        public String token;
        public String newPassword;
    }

    private boolean isValidEmail(String email) {
        if (email == null) return false;
        return email.matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$");
    }

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody RegisterRequest req, HttpSession session) {
        log.info("Received registration request for username: {}", req.username);

        if (req.username == null || req.username.trim().isEmpty() ||
            req.password == null || req.password.trim().isEmpty() ||
            req.name == null || req.name.trim().isEmpty()) {
            log.warn("Registration failed: Missing fields");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "All fields are required");
        }

        String email = req.username.trim();
        if (!isValidEmail(email)) {
            log.warn("Registration failed: Invalid email format: {}", email);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email format");
        }

        if (req.password.length() < 6) {
            log.warn("Registration failed: Password too short");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        Optional<User> existing = userRepository.findByUsername(email);
        if (existing.isPresent()) {
            log.warn("Registration failed: Username already taken: {}", email);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already taken");
        }

        String hashed = PasswordHasher.hash(req.password);
        User user = new User(email, hashed, req.name.trim(), 28, 5);
        User saved = userRepository.save(user);

        log.info("User registered successfully: id={}", saved.getId());
        session.setAttribute("user", saved);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody LoginRequest req, HttpSession session) {
        log.info("Received login request for username: {}", req.username);

        if (req.username == null || req.username.trim().isEmpty() ||
            req.password == null || req.password.trim().isEmpty()) {
            log.warn("Login failed: Missing username or password");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password required");
        }

        String username = req.username.trim();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("Login failed: User not found: {}", username);
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
                });

        if (!PasswordHasher.checkPassword(req.password, user.getPasswordHash())) {
            log.warn("Login failed: Incorrect password for user: {}", username);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        log.info("User logged in successfully: id={}", user.getId());
        session.setAttribute("user", user);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody ForgotPasswordRequest req) {
        log.info("Received forgot-password request for username/email: {}", req.username);

        if (req.username == null || req.username.trim().isEmpty()) {
            log.warn("Forgot password failed: Missing email");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        String email = req.username.trim();
        if (!isValidEmail(email)) {
            log.warn("Forgot password failed: Invalid email format: {}", email);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email format");
        }

        User user = userRepository.findByUsername(email)
                .orElseThrow(() -> {
                    log.warn("Forgot password failed: User not found: {}", email);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with this email");
                });

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        String resetLink = appBaseUrl + "/?resetToken=" + token;
        log.info("--------------------------------------------------------------------------------");
        log.info("PASSWORD RESET REQUESTED FOR: {}", email);
        log.info("RESET LINK (dev fallback): {}", resetLink);
        log.info("--------------------------------------------------------------------------------");

        // Send password reset email (no-op in mock/dev mode)
        emailService.sendPasswordResetEmail(email, token);

        Map<String, String> response = new HashMap<>();
        response.put("message", "If an account with that email exists, a password reset link has been sent.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordTokenRequest req) {
        log.info("Received token-based password reset request");

        if (req.token == null || req.token.trim().isEmpty() ||
            req.newPassword == null || req.newPassword.trim().isEmpty()) {
            log.warn("Password reset failed: Missing token or new password");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token and new password are required");
        }

        if (req.newPassword.length() < 6) {
            log.warn("Password reset failed: New password too short");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        User user = userRepository.findByResetToken(req.token.trim())
                .orElseThrow(() -> {
                    log.warn("Password reset failed: Invalid reset token: {}", req.token);
                    return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token");
                });

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            log.warn("Password reset failed: Reset token has expired for user: {}", user.getUsername());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token");
        }

        String hashed = PasswordHasher.hash(req.newPassword);
        user.setPasswordHash(hashed);
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        log.info("Password reset successfully for user: {}", user.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        log.info("Invalidating user session");
        session.invalidate();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check")
    public ResponseEntity<User> check(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not logged in");
        }
        return ResponseEntity.ok(user);
    }
}
