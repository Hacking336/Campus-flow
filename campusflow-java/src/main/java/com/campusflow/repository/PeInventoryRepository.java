package com.campusflow.repository;

import com.campusflow.model.PeInventory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class PeInventoryRepository {

    private final JdbcTemplate jdbcTemplate;

    public PeInventoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<PeInventory> findAll() {
        String sql = "SELECT item, size, quantity FROM pe_inventory";
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            PeInventory inventory = new PeInventory();
            inventory.setItem(rs.getString("item"));
            inventory.setSize(rs.getString("size"));
            inventory.setQuantity(rs.getInt("quantity"));
            return inventory;
        });
    }

    public PeInventory findByItemAndSize(String item, String size) {
        String sql = "SELECT item, size, quantity FROM pe_inventory WHERE item = ? AND size = ?";
        return jdbcTemplate.queryForObject(sql, new Object[]{item, size}, (rs, rowNum) -> {
            PeInventory inventory = new PeInventory();
            inventory.setItem(rs.getString("item"));
            inventory.setSize(rs.getString("size"));
            inventory.setQuantity(rs.getInt("quantity"));
            return inventory;
        });
    }

    public PeInventory save(PeInventory inventory) {
        String sql = "INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?) " +
                     "ON CONFLICT(item, size) DO UPDATE SET quantity = ?";
        jdbcTemplate.update(sql,
                inventory.getItem(),
                inventory.getSize(),
                inventory.getQuantity(),
                inventory.getQuantity());
        return inventory;
    }

    public void deleteByItemAndSize(String item, String size) {
        String sql = "DELETE FROM pe_inventory WHERE item = ? AND size = ?";
        jdbcTemplate.update(sql, item, size);
    }

    public int updateQuantity(String item, String size, int quantity) {
        String sql = "UPDATE pe_inventory SET quantity = ? WHERE item = ? AND size = ?";
        return jdbcTemplate.update(sql, quantity, item, size);
    }
}