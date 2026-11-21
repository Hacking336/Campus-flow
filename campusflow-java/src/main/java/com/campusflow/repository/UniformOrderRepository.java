package com.campusflow.repository;

import com.campusflow.model.UniformOrder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class UniformOrderRepository {

    private final JdbcTemplate jdbcTemplate;

    public UniformOrderRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<UniformOrder> findByStudentNo(String studentNo) {
        String sql = "SELECT student_no, category, item, size, status, tailoring_status, date_ordered, time_ordered, remarks, encoded_by, updated_by, created_at, updated_at FROM uniform_orders WHERE student_no = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, new Object[]{studentNo}, (rs, rowNum) -> {
            UniformOrder order = new UniformOrder();
            order.setStudentNo(rs.getString("student_no"));
            order.setCategory(rs.getString("category"));
            order.setItem(rs.getString("item"));
            order.setSize(rs.getString("size"));
            order.setStatus(rs.getString("status"));
            order.setTailoringStatus(rs.getString("tailoring_status"));
            order.setDateOrdered(rs.getString("date_ordered"));
            order.setTimeOrdered(rs.getString("time_ordered"));
            order.setRemarks(rs.getString("remarks"));
            order.setEncodedBy(rs.getString("encoded_by"));
            order.setUpdatedBy(rs.getString("updated_by"));
            order.setCreatedAt(rs.getString("created_at"));
            order.setUpdatedAt(rs.getString("updated_at"));
            return order;
        });
    }

    public List<UniformOrder> findAll() {
        String sql = "SELECT student_no, category, item, size, status, tailoring_status, date_ordered, time_ordered, remarks, encoded_by, updated_by, created_at, updated_at FROM uniform_orders ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            UniformOrder order = new UniformOrder();
            order.setStudentNo(rs.getString("student_no"));
            order.setCategory(rs.getString("category"));
            order.setItem(rs.getString("item"));
            order.setSize(rs.getString("size"));
            order.setStatus(rs.getString("status"));
            order.setTailoringStatus(rs.getString("tailoring_status"));
            order.setDateOrdered(rs.getString("date_ordered"));
            order.setTimeOrdered(rs.getString("time_ordered"));
            order.setRemarks(rs.getString("remarks"));
            order.setEncodedBy(rs.getString("encoded_by"));
            order.setUpdatedBy(rs.getString("updated_by"));
            order.setCreatedAt(rs.getString("created_at"));
            order.setUpdatedAt(rs.getString("updated_at"));
            return order;
        });
    }

    public UniformOrder save(UniformOrder order) {
        String sql = "INSERT INTO uniform_orders (student_no, category, item, size, status, tailoring_status, date_ordered, time_ordered, remarks, encoded_by, updated_by, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                     "ON CONFLICT(student_no, category) DO UPDATE SET status = ?, tailoring_status = ?, updated_by = ?, updated_at = ?";
        jdbcTemplate.update(sql,
                order.getStudentNo(),
                order.getCategory(),
                order.getItem(),
                order.getSize(),
                order.getStatus(),
                order.getTailoringStatus(),
                order.getDateOrdered(),
                order.getTimeOrdered(),
                order.getRemarks(),
                order.getEncodedBy(),
                order.getUpdatedBy(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getStatus(),
                order.getTailoringStatus(),
                order.getUpdatedBy(),
                order.getUpdatedAt());
        return order;
    }

    public void deleteByStudentNoAndCategory(String studentNo, String category) {
        String sql = "DELETE FROM uniform_orders WHERE student_no = ? AND category = ?";
        jdbcTemplate.update(sql, studentNo, category);
    }
}