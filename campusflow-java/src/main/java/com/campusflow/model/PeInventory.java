package com.campusflow.model;

public class PeInventory {
    private String item;
    private String size;
    private int quantity;

    // Default constructor
    public PeInventory() {}

    // Constructor with all fields
    public PeInventory(String item, String size, int quantity) {
        this.item = item;
        this.size = size;
        this.quantity = quantity;
    }

    // Getters and setters
    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    @Override
    public String toString() {
        return "PeInventory{" +
                "item='" + item + '\'' +
                ", size='" + size + '\'' +
                ", quantity=" + quantity +
                '}';
    }
}