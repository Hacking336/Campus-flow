package com.campusflow.repository;

import com.campusflow.model.Document;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class DocumentRepository {

    private final JdbcTemplate jdbcTemplate;

    public DocumentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Document> findByStudentNo(String studentNo) {
        String sql = "SELECT student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, updated_by, created_at, updated_at FROM documents WHERE student_no = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, new Object[]{studentNo}, (rs, rowNum) -> {
            Document doc = new Document();
            doc.setStudentNo(rs.getString("student_no"));
            doc.setDocType(rs.getString("doc_type"));
            doc.setStatus(rs.getString("status"));
            doc.setDateRequested(rs.getString("date_requested"));
            doc.setDateReady(rs.getString("date_ready"));
            doc.setRemarks(rs.getString("remarks"));
            doc.setEncodedBy(rs.getString("encoded_by"));
            doc.setUpdatedBy(rs.getString("updated_by"));
            doc.setCreatedAt(rs.getString("created_at"));
            doc.setUpdatedAt(rs.getString("updated_at"));
            return doc;
        });
    }

    public List<Document> findAll() {
        String sql = "SELECT student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, updated_by, created_at, updated_at FROM documents ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Document doc = new Document();
            doc.setStudentNo(rs.getString("student_no"));
            doc.setDocType(rs.getString("doc_type"));
            doc.setStatus(rs.getString("status"));
            doc.setDateRequested(rs.getString("date_requested"));
            doc.setDateReady(rs.getString("date_ready"));
            doc.setRemarks(rs.getString("remarks"));
            doc.setEncodedBy(rs.getString("encoded_by"));
            doc.setUpdatedBy(rs.getString("updated_by"));
            doc.setCreatedAt(rs.getString("created_at"));
            doc.setUpdatedAt(rs.getString("updated_at"));
            return doc;
        });
    }

    public Document save(Document document) {
        String sql = "INSERT INTO documents (student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, updated_by, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                     "ON CONFLICT(student_no, doc_type) DO UPDATE SET status = ?, date_ready = ?, updated_by = ?, updated_at = ?";
        jdbcTemplate.update(sql,
                document.getStudentNo(),
                document.getDocType(),
                document.getStatus(),
                document.getDateRequested(),
                document.getDateReady(),
                document.getRemarks(),
                document.getEncodedBy(),
                document.getUpdatedBy(),
                document.getCreatedAt(),
                document.getUpdatedAt(),
                document.getStatus(),
                document.getDateReady(),
                document.getUpdatedBy(),
                document.getUpdatedAt());
        return document;
    }

    public void deleteByStudentNoAndDocType(String studentNo, String docType) {
        String sql = "DELETE FROM documents WHERE student_no = ? AND doc_type = ?";
        jdbcTemplate.update(sql, studentNo, docType);
    }
}