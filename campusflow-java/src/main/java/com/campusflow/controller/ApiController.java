package com.campusflow.controller;

import com.campusflow.model.*;
import com.campusflow.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PeInventoryRepository peInventoryRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UniformOrderRepository uniformOrderRepository;

    // GET /api/health
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("ok", true, "time", java.time.Instant.now().toString()));
    }

    // GET /api/public/config
    @GetMapping("/public/config")
    public ResponseEntity<?> publicConfig() {
        // Return default settings
        Map<String, Object> config = new java.util.HashMap<>();
        config.put("allow_student_registration", "1");
        config.put("school_year", "2026–2027");
        config.put("semester", "1st Semester");
        return ResponseEntity.ok(config);
    }

    // === STUDENT ENDPOINTS ===

    // GET /api/students
    @GetMapping("/students")
    public ResponseEntity<List<Student>> getStudents() {
        List<Student> students = studentRepository.findAll();
        return ResponseEntity.ok(students);
    }

    // GET /api/students/{studentNo}
    @GetMapping("/students/{studentNo}")
    public ResponseEntity<Student> getStudentByNo(@PathVariable String studentNo) {
        Student student = studentRepository.findByStudentNo(studentNo);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(student);
    }

    // POST /api/students
    @PostMapping("/students")
    public ResponseEntity<Student> createStudent(@RequestBody Student student) {
        Student saved = studentRepository.save(student);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/students/{studentNo}
    @PutMapping("/students/{studentNo}")
    public ResponseEntity<Student> updateStudent(@PathVariable String studentNo, @RequestBody Student student) {
        Student existing = studentRepository.findByStudentNo(studentNo);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        student.setStudentNo(studentNo);
        Student updated = studentRepository.save(student);
        return ResponseEntity.ok(updated);
    }

    // DELETE /api/students/{studentNo}
    @DeleteMapping("/students/{studentNo}")
    public ResponseEntity<?> deleteStudent(@PathVariable String studentNo) {
        studentRepository.deleteByStudentNo(studentNo);
        return ResponseEntity.ok().build();
    }

    // === USER/ACCOUNT ENDPOINTS (within API) ===

    // GET /api/users/role/{role}
    @GetMapping("/users/role/{role}")
    public ResponseEntity<List<User>> getUsersByRole(@PathVariable String role) {
        List<User> users = userRepository.findByRole(role);
        return ResponseEntity.ok(users);
    }

    // === PE INVENTORY ENDPOINTS ===

    // GET /api/pe-inventory
    @GetMapping("/pe-inventory")
    public ResponseEntity<List<PeInventory>> getPeInventory() {
        List<PeInventory> inventory = peInventoryRepository.findAll();
        return ResponseEntity.ok(inventory);
    }

    // GET /api/pe-inventory/{item}/{size}
    @GetMapping("/pe-inventory/{item}/{size}")
    public ResponseEntity<PeInventory> getPeInventoryByItemAndSize(@PathVariable String item, @PathVariable String size) {
        PeInventory inventory = peInventoryRepository.findByItemAndSize(item, size);
        if (inventory == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(inventory);
    }

    // POST /api/pe-inventory
    @PostMapping("/pe-inventory")
    public ResponseEntity<PeInventory> addPeInventory(@RequestBody PeInventory inventory) {
        PeInventory saved = peInventoryRepository.save(inventory);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/pe-inventory/{item}/{size}
    @PutMapping("/pe-inventory/{item}/{size}")
    public ResponseEntity<PeInventory> updatePeInventory(@PathVariable String item, @PathVariable String size, @RequestBody PeInventory inventoryDetails) {
        PeInventory existing = peInventoryRepository.findByItemAndSize(item, size);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        int quantity = inventoryDetails.getQuantity() <= 0 ? existing.getQuantity() + inventoryDetails.getQuantity() : inventoryDetails.getQuantity();
        peInventoryRepository.updateQuantity(item, size, quantity);
        PeInventory result = peInventoryRepository.findByItemAndSize(item, size);
        return ResponseEntity.ok(result != null ? result : existing);    }

    // DELETE /api/pe-inventory/{item}/{size}
    @DeleteMapping("/pe-inventory/{item}/{size}")
    public ResponseEntity<?> deletePeInventory(@PathVariable String item, @PathVariable String size) {
        peInventoryRepository.deleteByItemAndSize(item, size);
        return ResponseEntity.ok().build();
    }

    // === DOCUMENT ENDPOINTS ===

    // GET /api/documents/{studentNo}
    @GetMapping("/documents/{studentNo}")
    public ResponseEntity<List<Document>> getDocumentsByStudentNo(@PathVariable String studentNo) {
        List<Document> documents = documentRepository.findByStudentNo(studentNo);
        return ResponseEntity.ok(documents);
    }

    // GET /api/documents
    @GetMapping("/documents")
    public ResponseEntity<List<Document>> getAllDocuments() {
        List<Document> documents = documentRepository.findAll();
        return ResponseEntity.ok(documents);
    }

    // POST /api/documents
    @PostMapping("/documents")
    public ResponseEntity<Document> createDocument(@RequestBody Document document) {
        Document saved = documentRepository.save(document);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/documents/{studentNo}/{docType}
    @PutMapping("/documents/{studentNo}/{docType}")
    public ResponseEntity<Document> updateDocument(@PathVariable String studentNo, @PathVariable String docType, @RequestBody Document document) {
        Document existing = documentRepository.findByStudentNo(studentNo).stream()
                .filter(d -> d.getDocType().equals(docType))
                .findFirst()
                .orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        document.setStudentNo(studentNo);
        document.setUpdatedAt(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(java.time.LocalDateTime.now()));
        Document updated = documentRepository.save(document);
        return ResponseEntity.ok(updated);
    }

    // DELETE /api/documents/{studentNo}/{docType}
    @DeleteMapping("/documents/{studentNo}/{docType}")
    public ResponseEntity<?> deleteDocument(@PathVariable String studentNo, @PathVariable String docType) {
        documentRepository.deleteByStudentNoAndDocType(studentNo, docType);
        return ResponseEntity.ok().build();
    }

    // === UNIFORM ORDER ENDPOINTS ===

    // GET /api/uniform-orders/{studentNo}
    @GetMapping("/uniform-orders/{studentNo}")
    public ResponseEntity<List<UniformOrder>> getUniformOrdersByStudentNo(@PathVariable String studentNo) {
        List<UniformOrder> orders = uniformOrderRepository.findByStudentNo(studentNo);
        return ResponseEntity.ok(orders);
    }

    // GET /api/uniform-orders
    @GetMapping("/uniform-orders")
    public ResponseEntity<List<UniformOrder>> getAllUniformOrders() {
        List<UniformOrder> orders = uniformOrderRepository.findAll();
        return ResponseEntity.ok(orders);
    }

    // POST /api/uniform-orders
    @PostMapping("/uniform-orders")
    public ResponseEntity<UniformOrder> createUniformOrder(@RequestBody UniformOrder order) {
        UniformOrder saved = uniformOrderRepository.save(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/uniform-orders/{studentNo}/{category}
    @PutMapping("/uniform-orders/{studentNo}/{category}")
    public ResponseEntity<UniformOrder> updateUniformOrder(@PathVariable String studentNo, @PathVariable String category, @RequestBody UniformOrder order) {
        UniformOrder existing = uniformOrderRepository.findByStudentNo(studentNo).stream()
                .filter(o -> o.getCategory().equals(category))
                .findFirst()
                .orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        order.setStudentNo(studentNo);
        order.setUpdatedAt(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(java.time.LocalDateTime.now()));
        UniformOrder updated = uniformOrderRepository.save(order);
        return ResponseEntity.ok(updated);
    }

    // DELETE /api/uniform-orders/{studentNo}/{category}
    @DeleteMapping("/uniform-orders/{studentNo}/{category}")
    public ResponseEntity<?> deleteUniformOrder(@PathVariable String studentNo, @PathVariable String category) {
        uniformOrderRepository.deleteByStudentNoAndCategory(studentNo, category);
        return ResponseEntity.ok().build();
    }
}