ALTER TABLE properties
  ADD COLUMN availability_confirmed_at DATETIME NULL;

UPDATE properties
SET availability_confirmed_at = created_at
WHERE availability_confirmed_at IS NULL;

ALTER TABLE properties
  MODIFY COLUMN availability_confirmed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE property_units
  ADD COLUMN last_confirmed_at DATETIME NULL;

UPDATE property_units
SET last_confirmed_at = created_at
WHERE last_confirmed_at IS NULL;

ALTER TABLE property_units
  MODIFY COLUMN last_confirmed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE reports
  ADD KEY idx_reports_property_status_created (property_id, status, created_at);

CREATE TABLE IF NOT EXISTS availability_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NULL,
  actor_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(60) NOT NULL,
  previous_status VARCHAR(32) NULL,
  new_status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_availability_events_property_created (property_id, created_at),
  KEY idx_availability_events_unit_created (unit_id, created_at),
  CONSTRAINT fk_availability_events_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_availability_events_unit
    FOREIGN KEY (unit_id) REFERENCES property_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_availability_events_actor
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
