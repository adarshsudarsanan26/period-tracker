package com.pms.tracker.controller;

import com.pms.tracker.model.User;
import com.pms.tracker.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HttpSession session;

    private User getLoggedInUser() {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not logged in");
        }
        return user;
    }

    @GetMapping("/current")
    public ResponseEntity<User> getCurrentUser() {
        User user = getLoggedInUser();
        // Reload to get latest from DB
        User current = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(current);
    }

    @PutMapping("/current")
    public ResponseEntity<User> updateCurrentUser(@RequestBody User userDetails) {
        User user = getLoggedInUser();
        User current = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        current.setName(userDetails.getName());
        current.setDefaultCycleLength(userDetails.getDefaultCycleLength());
        current.setDefaultPeriodDuration(userDetails.getDefaultPeriodDuration());
        
        User updatedUser = userRepository.save(current);
        session.setAttribute("user", updatedUser); // Update in session cache
        return ResponseEntity.ok(updatedUser);
    }
}
