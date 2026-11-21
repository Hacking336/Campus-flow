package com.campusflow.model;

public class Student {
    private String studentNo;
    private String fullName;
    private String program;
    private String yearLevel;
    private String section;
    private String email;
    private String createdAt;
    private String updatedAt;

    // Default constructor
    public Student() {}

    // Constructor with all fields
    public Student(String studentNo, String fullName, String program, String yearLevel, String section, String email, String createdAt, String updatedAt) {
        this.studentNo = studentNo;
        this.fullName = fullName;
        this.program = program;
        this.yearLevel = yearLevel;
        this.section = section;
        this.email = email;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and setters
    public String getStudentNo() { return studentNo; }
    public void setStudentNo(String studentNo) { this.studentNo = studentNo; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getProgram() { return program; }
    public void setProgram(String program) { this.program = program; }
    public String getYearLevel() { return yearLevel; }
    public void setYearLevel(String yearLevel) { this.yearLevel = yearLevel; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public String toString() {
        return "Student{" +
                "studentNo='" + studentNo + '\'' +
                ", fullName='" + fullName + '\'' +
                ", program='" + program + '\'' +
                ", yearLevel='" + yearLevel + '\'' +
                ", section='" + section + '\'' +
                ", email='" + email + '\'' +
                '}';
    }
}