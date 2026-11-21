package com.campusflow.repository;

import com.campusflow.model.Student;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class StudentRepository {

    private final JdbcTemplate jdbcTemplate;

    public StudentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Student> findAll() {
        String sql = "SELECT student_no, full_name, program, year_level, section, email, created_at, updated_at FROM students";
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Student student = new Student();
            student.setStudentNo(rs.getString("student_no"));
            student.setFullName(rs.getString("full_name"));
            student.setProgram(rs.getString("program"));
            student.setYearLevel(rs.getString("year_level"));
            student.setSection(rs.getString("section"));
            student.setEmail(rs.getString("email"));
            student.setCreatedAt(rs.getString("created_at"));
            student.setUpdatedAt(rs.getString("updated_at"));
            return student;
        });
    }

    public Student findByStudentNo(String studentNo) {
        String sql = "SELECT student_no, full_name, program, year_level, section, email, created_at, updated_at FROM students WHERE student_no = ?";
        return jdbcTemplate.queryForObject(sql, new Object[]{studentNo}, (rs, rowNum) -> {
            Student student = new Student();
            student.setStudentNo(rs.getString("student_no"));
            student.setFullName(rs.getString("full_name"));
            student.setProgram(rs.getString("program"));
            student.setYearLevel(rs.getString("year_level"));
            student.setSection(rs.getString("section"));
            student.setEmail(rs.getString("email"));
            student.setCreatedAt(rs.getString("created_at"));
            student.setUpdatedAt(rs.getString("updated_at"));
            return student;
        });
    }

    public Student save(Student student) {
        String sql = "INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
                     "ON CONFLICT(student_no) DO UPDATE SET full_name = ?, program = ?, year_level = ?, section = ?, email = ?, updated_at = ?";
        jdbcTemplate.update(sql,
                student.getStudentNo(),
                student.getFullName(),
                student.getProgram(),
                student.getYearLevel(),
                student.getSection(),
                student.getEmail(),
                student.getCreatedAt(),
                student.getUpdatedAt(),
                student.getFullName(),
                student.getProgram(),
                student.getYearLevel(),
                student.getSection(),
                student.getEmail(),
                student.getUpdatedAt());
        return student;
    }

    public void deleteByStudentNo(String studentNo) {
        String sql = "DELETE FROM students WHERE student_no = ?";
        jdbcTemplate.update(sql, studentNo);
    }
}