package com.campusflow;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class CampusFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(CampusFlowApplication.class, args);
        System.out.println("CampusFlow API started on http://localhost:4318");
    }

    @Bean
    CommandLineRunner initDatabase(JdbcTemplate jdbcTemplate) {
        return args -> {
            // Create tables
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS students (" +
                "student_no TEXT PRIMARY KEY," +
                "full_name TEXT NOT NULL," +
                "program TEXT," +
                "year_level TEXT," +
                "section TEXT," +
                "email TEXT," +
                "created_at TEXT," +
                "updated_at TEXT)");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS users (" +
                "username TEXT PRIMARY KEY," +
                "role TEXT NOT NULL," +
                "full_name TEXT," +
                "email TEXT," +
                "password_hash TEXT," +
                "avatar TEXT," +
                "student_no TEXT," +
                "created_at TEXT," +
                "updated_at TEXT)");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS pe_inventory (" +
                "item TEXT NOT NULL," +
                "size TEXT NOT NULL," +
                "quantity INTEGER NOT NULL," +
                "PRIMARY KEY (item, size))");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS documents (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "student_no TEXT NOT NULL," +
                "doc_type TEXT NOT NULL," +
                "status TEXT NOT NULL," +
                "date_requested TEXT," +
                "date_ready TEXT," +
                "remarks TEXT," +
                "encoded_by TEXT," +
                "updated_by TEXT," +
                "created_at TEXT," +
                "updated_at TEXT)");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS uniform_orders (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "student_no TEXT NOT NULL," +
                "category TEXT," +
                "item TEXT," +
                "size TEXT," +
                "status TEXT," +
                "tailoring_status TEXT," +
                "date_ordered TEXT," +
                "time_ordered TEXT," +
                "remarks TEXT," +
                "encoded_by TEXT," +
                "updated_by TEXT," +
                "created_at TEXT," +
                "updated_at TEXT)");

            // Insert seed data
            jdbcTemplate.execute("DELETE FROM uniform_orders");
            jdbcTemplate.execute("DELETE FROM documents");
            jdbcTemplate.execute("DELETE FROM pe_inventory");
            jdbcTemplate.execute("DELETE FROM users");
            jdbcTemplate.execute("DELETE FROM students");

            // Insert students
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00101", "Juan Miguel Reyes", "BS Information Technology", "3rd Year", "A", "juanmiguel.reyes@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00102", "Althea Marie Cruz", "BS Nursing", "2nd Year", "B", "althea.cruz@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2023-00214", "Mark Angelo Dela Cruz", "BS Accountancy", "4th Year", "A", "mark.delacruz@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2025-00308", "Sofia Isabel Garcia", "BS Civil Engineering", "1st Year", "C", "sofia.garcia@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00147", "Nico Benedict Lim", "BS Information Technology", "2nd Year", "B", "nico.lim@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2023-00256", "Patricia Anne Mendoza", "BS Education", "4th Year", "A", "patricia.mendoza@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2025-00312", "Rafael Luis Torres", "BS Nursing", "1st Year", "A", "rafael.torres@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00188", "Bea Camille Ramos", "BS Accountancy", "3rd Year", "B", "bea.ramos@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2023-00201", "Christian Paolo Aquino", "BS Civil Engineering", "3rd Year", "A", "christian.aquino@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2025-00345", "Larah Denise Villanueva", "BS Information Technology", "1st Year", "C", "larah.villanueva@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00163", "Gabriel Isaiah Flores", "BS Education", "2nd Year", "B", "gabriel.flores@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO students (student_no, full_name, program, year_level, section, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                "2025-00329", "Hannah Grace Bautista", "BS Nursing", "2nd Year", "A", "hannah.bautista@campus.edu.ph",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");

            // Insert staff accounts
            jdbcTemplate.update("INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "admin", "admin", "Maria Elena Santos", "registrar@campus.edu.ph", "Campus123", null, null,
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "registrar", "registrar", "Jose Carlo Dela Cruz", "records@campus.edu.ph", "Campus123", null, null,
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "custodian", "custodian", "Ana Liza Reyes", "property@campus.edu.ph", "Campus123", null, null,
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");

            // Insert P.E. inventory
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Pants", "S", 12);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Pants", "M", 16);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Pants", "L", 12);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Pants", "XL", 8);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Pants", "2XL", 5);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Pants", "3XL", 2);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Shirt", "XS", 6);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Shirt", "S", 12);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Shirt", "M", 18);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Shirt", "L", 14);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Shirt", "XL", 9);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Shirt", "2XL", 5);
            jdbcTemplate.update("INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)", "Shirt", "3XL", 3);

            // Insert sample documents
            jdbcTemplate.update("INSERT INTO documents (student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00101", "COR", "ready", "2026-11-15", "2026-11-20", "Bring your school ID.", "Jose Carlo Dela Cruz",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO documents (student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00101", "COG", "processing", "2026-11-17", null, "For scholarship application.", "Jose Carlo Dela Cruz",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO documents (student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00102", "COG", "ready", "2026-11-13", "2026-11-18", "Ready at Window 1.", "Jose Carlo Dela Cruz",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO documents (student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "2023-00214", "TOR", "processing", "2026-11-18", null, "For employment.", "Jose Carlo Dela Cruz",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO documents (student_no, doc_type, status, date_requested, date_ready, remarks, encoded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "2025-00308", "COR", "ready", "2026-11-16", "2026-11-20", "Pick up before 4:30 PM.", "Jose Carlo Dela Cruz",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");

            // Insert sample uniform orders
            jdbcTemplate.update("INSERT INTO uniform_orders (student_no, category, item, size, status, tailoring_status, date_ordered, time_ordered, remarks, encoded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "2024-00102", "Nursing", null, null, "ordered", "sewing", "2026-11-16", "13:15", "Clinical uniform with name embroidery.", "Ana Liza Reyes",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");
            jdbcTemplate.update("INSERT INTO uniform_orders (student_no, category, item, size, status, tailoring_status, date_ordered, time_ordered, remarks, encoded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "2023-00214", "General", null, null, "ready", "finished", "2026-11-18", "10:05", "Pick up at the Property Office.", "Ana Liza Reyes",
                "2026-01-01 00:00:00", "2026-01-01 00:00:00");

            // Insert student user accounts (using student number as username)
            String[][] studentsUser = {
                    {"2024-00101", "student", "Juan Miguel Reyes"},
                    {"2024-00102", "student", "Althea Marie Cruz"},
                    {"2023-00214", "student", "Mark Angelo Dela Cruz"},
                    {"2025-00308", "student", "Sofia Isabel Garcia"},
                    {"2024-00147", "student", "Nico Benedict Lim"},
                    {"2023-00256", "student", "Patricia Anne Mendoza"},
                    {"2025-00312", "student", "Rafael Luis Torres"},
                    {"2024-00188", "student", "Bea Camille Ramos"},
                    {"2023-00201", "student", "Christian Paolo Aquino"},
                    {"2025-00345", "student", "Larah Denise Villanueva"},
                    {"2024-00163", "student", "Gabriel Isaiah Flores"},
                    {"2025-00329", "student", "Hannah Grace Bautista"}
            };
            for (String[] s : studentsUser) {
                jdbcTemplate.update(
                        "INSERT INTO users (username, role, full_name, email, password_hash, avatar, student_no, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        s[0], s[1], s[2], null, "Campus123", null, s[0], java.time.LocalDateTime.now().toString(), java.time.LocalDateTime.now().toString()
                );
            }

            System.out.println("Database initialized with demo data.");
        };
    }
}