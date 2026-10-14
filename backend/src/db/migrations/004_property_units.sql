CREATE TABLE IF NOT EXISTS property_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  unit_name VARCHAR(120) NOT NULL,
  availability_status ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CONFIRMATION_REQUIRED') NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_property_units_name (property_id, unit_name),
  KEY idx_property_units_property_status (property_id, availability_status),
  CONSTRAINT fk_property_units_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
