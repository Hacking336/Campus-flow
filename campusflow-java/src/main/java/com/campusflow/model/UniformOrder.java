package com.campusflow.model;

public class UniformOrder {
    private String studentNo;
    private String category;
    private String item;
    private String size;
    private String status;
    private String tailoringStatus;
    private String dateOrdered;
    private String timeOrdered;
    private String remarks;
    private String encodedBy;
    private String updatedBy;
    private String createdAt;
    private String updatedAt;

    // Default constructor
    public UniformOrder() {}

    // Constructor with all fields
    public UniformOrder(String studentNo, String category, String item, String size, String status, String tailoringStatus, String dateOrdered, String timeOrdered, String remarks, String encodedBy, String updatedBy, String createdAt, String updatedAt) {
        this.studentNo = studentNo;
        this.category = category;
        this.item = item;
        this.size = size;
        this.status = status;
        this.tailoringStatus = tailoringStatus;
        this.dateOrdered = dateOrdered;
        this.timeOrdered = timeOrdered;
        this.remarks = remarks;
        this.encodedBy = encodedBy;
        this.updatedBy = updatedBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and setters
    public String getStudentNo() { return studentNo; }
    public void setStudentNo(String studentNo) { this.studentNo = studentNo; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTailoringStatus() { return tailoringStatus; }
    public void setTailoringStatus(String tailoringStatus) { this.tailoringStatus = tailoringStatus; }
    public String getDateOrdered() { return dateOrdered; }
    public void setDateOrdered(String dateOrdered) { this.dateOrdered = dateOrdered; }
    public String getTimeOrdered() { return timeOrdered; }
    public void setTimeOrdered(String timeOrdered) { this.timeOrdered = timeOrdered; }
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
        return "UniformOrder{" +
                "studentNo='" + studentNo + '\'' +
                ", category='" + category + '\'' +
                ", item='" + item + '\'' +
                ", size='" + size + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}