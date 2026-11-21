package com.campusflow.controller;

import com.campusflow.model.User;
import com.campusflow.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    @Autowired
    private UserRepository userRepository;

    // POST /api/auth/login - login with username/password (staff) or student number (students)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Username is required"));
        }

        // Try to find user by username (staff accounts)
        User user = userRepository.findByUsername(username);

        // If not found by username, try by student number (student accounts)
        if (user == null) {
            // Check if the username looks like a student number pattern
            if (username.matches("^20\\d{3}-\\d{5}$")) {
                // Student login - verify password and check if student exists
                String defaultPassword = "Campus123";
                if (password != null && password.equals(defaultPassword)) {
                    // Check if a user with this student number exists
                    user = userRepository.findByUsername(username);
                    // If no user found with that username, create one automatically
                    if (user == null) {
                        user = new User();
                        user.setUsername(username);
                        user.setPasswordHash(password);
                        user.setRole("student");
                        user.setFullName("Student " + username);
                        user.setStudentNo(username);
                        user.setCreatedAt(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(java.time.LocalDateTime.now()));
                        user.setUpdatedAt(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(java.time.LocalDateTime.now()));
                        userRepository.save(user);
                    }
                }
            }
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }

        // Check password for staff users
        if ("admin".equals(user.getUsername()) || "registrar".equals(user.getUsername()) || "custodian".equals(user.getUsername())) {
            if (password == null || !"Campus123".equals(password)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid username or password"));
            }
        }

        // Generate token
        String token = "token:" + user.getUsername() + ":demo";

        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        response.put("token", token);
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("username", user.getUsername());
        userInfo.put("role", user.getRole());
        userInfo.put("fullName", user.getFullName());
        userInfo.put("studentNo", user.getStudentNo());
        response.put("user", userInfo);

        return ResponseEntity.ok(response);
    }

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> userData) {
        String username = userData.get("username");
        String password = userData.get("password");
        String fullName = userData.get("fullName");
        String email = userData.get("email");
        String role = userData.getOrDefault("role", "student");
        String studentNo = userData.get("studentNo");

        if (username == null || password == null || fullName == null || email == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
        }

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(password);
        user.setRole(role);
        user.setFullName(fullName);
        user.setEmail(email);
        user.setStudentNo(studentNo);
        user.setAvatar(null);
        user.setCreatedAt(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(java.time.LocalDateTime.now()));
        user.setUpdatedAt(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(java.time.LocalDateTime.now()));

        userRepository.save(user);

        String token = "token:" + user.getUsername() + ":demo";

        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        response.put("token", token);
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("username", user.getUsername());
        userInfo.put("role", user.getRole());
        userInfo.put("fullName", user.getFullName());
        userInfo.put("studentNo", user.getStudentNo());
        response.put("user", userInfo);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // POST /api/auth/logout
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // GET /api/auth/profile
    @GetMapping("/profile")
    public ResponseEntity<?> profile(@RequestParam(required = false) String token, @RequestHeader(required = false) String authorization) {
        String authToken = token;
        if (authToken == null && authorization != null && authorization.startsWith("Bearer ")) {
            authToken = authorization.substring(7);
        }
        if (authToken == null || !authToken.startsWith("token:")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Missing or invalid token"));
        }
        // Token format: token:username:demo - extract username
        String usernamePart = authToken.substring(6);
        String username = usernamePart.contains(":") ? usernamePart.substring(0, usernamePart.indexOf(":")) : usernamePart;
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("username", user.getUsername() != null ? user.getUsername() : "");
        userInfo.put("role", user.getRole() != null ? user.getRole() : "");
        userInfo.put("fullName", user.getFullName() != null ? user.getFullName() : "");
        userInfo.put("studentNo", user.getStudentNo() != null ? user.getStudentNo() : "");
        userInfo.put("email", user.getEmail() != null ? user.getEmail() : "");
        userInfo.put("avatar", user.getAvatar() != null ? user.getAvatar() : "");
        response.put("user", userInfo);
        return ResponseEntity.ok(response);
    }

    // POST /api/auth/change-password
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> data) {
        String token = data.get("token");
        String newPassword = data.get("newPassword");

        if (token == null || !token.startsWith("token:") || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
        }

        String username = token.substring(6);
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found"));
        }

        user.setPasswordHash(newPassword);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("ok", true));
    }
}