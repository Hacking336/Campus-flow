package com.campusflow.model;

public class Document {
    private String studentNo;
    private String docType;
    private String status;
    private String dateRequested;
    private String dateReady;
    private String remarks;
    private String encodedBy;
    private String updatedBy;
    private String createdAt;
    private String updatedAt;

    // Default constructor
    public Document() {}

    // Constructor with all fields
    public Document(String studentNo, String docType, String status, String dateRequested, String dateReady, String remarks, String encodedBy, String updatedBy, String createdAt, String updatedAt) {
        this.studentNo = studentNo;
        this.docType = docType;
        this.status = status;
        this.dateRequested = dateRequested;
        this.dateReady = dateReady;
        this.remarks = remarks;
        this.encodedBy = encodedBy;
        this.updatedBy = updatedBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and setters
    public String getStudentNo() { return studentNo; }
    public void setStudentNo(String studentNo) { this.studentNo = studentNo; }
    public String getDocType() { return docType; }
    public void setDocType(String docType) { this.docType = docType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDateRequested() { return dateRequested; }
    public void setDateRequested(String dateRequested) { this.dateRequested = dateRequested; }
    public String getDateReady() { return dateReady; }
    public void setDateReady(String dateReady) { this.dateReady = dateReady; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public String getEncodedBy() { return encodedBy; }
    public void setEncodedBy(String encodedBy) { this.encodedBy = encodedBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public String toString() {
        return "Document{" +
                "studentNo='" + studentNo + '\'' +
                ", docType='" + docType + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}