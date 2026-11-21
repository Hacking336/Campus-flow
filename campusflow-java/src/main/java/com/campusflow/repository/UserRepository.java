package com.campusflow.repository;

import com.campusflow.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public User findByUsername(String username) {
        String sql = "SELECT username, password_hash, role, full_name, email, avatar, student_no, created_at, updated_at FROM users WHERE username = ?";
        return jdbcTemplate.queryForObject(sql, new Object[]{username}, (rs, rowNum) -> {
            User user = new User();
            user.setUsername(rs.getString("username"));
            user.setPasswordHash(rs.getString("password_hash"));
            user.setRole(rs.getString("role"));
            user.setFullName(rs.getString("full_name"));
            user.setEmail(rs.getString("email"));
            user.setAvatar(rs.getString("avatar"));
            user.setStudentNo(rs.getString("student_no"));
            user.setCreatedAt(rs.getString("created_at"));
            user.setUpdatedAt(rs.getString("updated_at"));
            return user;
        });
    }

    public List<User> findByRole(String role) {
        String sql = "SELECT username, password_hash, role, full_name, email, avatar, student_no, created_at, updated_at FROM users WHERE role = ?";
        return jdbcTemplate.query(sql, new Object[]{role}, (rs, rowNum) -> {
            User user = new User();
            user.setUsername(rs.getString("username"));
            user.setPasswordHash(rs.getString("password_hash"));
            user.setRole(rs.getString("role"));
            user.setFullName(rs.getString("full_name"));
            user.setEmail(rs.getString("email"));
            user.setAvatar(rs.getString("avatar"));
            user.setStudentNo(rs.getString("student_no"));
            user.setCreatedAt(rs.getString("created_at"));
            user.setUpdatedAt(rs.getString("updated_at"));
            return user;
        });
    }

    public User save(User user) {
        String sql = "INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                     "ON CONFLICT(username) DO UPDATE SET full_name = ?, email = ?, password_hash = ?, updated_at = ?";
        jdbcTemplate.update(sql,
                user.getUsername(),
                user.getPasswordHash(),
                user.getRole(),
                user.getFullName(),
                user.getEmail(),
                user.getAvatar(),
                user.getStudentNo(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getFullName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getUpdatedAt());
        return user;
    }

    public void deleteByUsername(String username) {
        String sql = "DELETE FROM users WHERE username = ?";
        jdbcTemplate.update(sql, username);
    }

    public boolean existsByUsername(String username) {
        String sql = "SELECT COUNT(*) FROM users WHERE username = ?";
        Integer count = jdbcTemplate.queryForObject(sql, new Object[]{username}, Integer.class);
        return count > 0;
    }
}