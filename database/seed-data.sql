-- Seed data for testing

-- Insert test users
INSERT INTO users (email, phone, name, password_hash) VALUES
('john@example.com', '+1234567890', 'John Doe', '$2a$10$hash1'),
('jane@example.com', '+1234567891', 'Jane Smith', '$2a$10$hash2')
ON CONFLICT (email) DO NOTHING;

-- Insert venues
INSERT INTO venues (id, name, address, city, capacity) VALUES
(1, 'Madison Square Garden', '4 Pennsylvania Plaza', 'New York', 20000),
(2, 'Hollywood Bowl', '2301 Highland Ave', 'Los Angeles', 17500),
(3, 'Red Rocks Amphitheatre', '18300 W Alameda Pkwy', 'Denver', 9525)
ON CONFLICT (id) DO NOTHING;

-- Insert events
INSERT INTO events (id, venue_id, title, description, event_date, doors_open, status, total_seats, available_seats) VALUES
(1, 1, 'Rock Festival 2026', 'The biggest rock festival of the year', '2026-06-15 20:00:00', '2026-06-15 18:00:00', 'UPCOMING', 15000, 15000),
(2, 2, 'Jazz Night Live', 'An evening with jazz legends', '2026-07-20 19:00:00', '2026-07-20 17:30:00', 'UPCOMING', 12000, 12000),
(3, 3, 'Indie Concert Series', 'Featuring emerging indie artists', '2026-08-10 21:00:00', '2026-08-10 19:00:00', 'UPCOMING', 9000, 9000)
ON CONFLICT (id) DO NOTHING;

-- Insert seats for event 1
INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status) VALUES
(1, 'A1', 'A', 'VIP', 299.99, 'AVAILABLE'),
(1, 'A2', 'A', 'VIP', 299.99, 'AVAILABLE'),
(1, 'B1', 'B', 'General', 99.99, 'AVAILABLE'),
(1, 'B2', 'B', 'General', 99.99, 'AVAILABLE'),
(1, 'C1', 'C', 'General', 79.99, 'AVAILABLE')
ON CONFLICT (event_id, seat_number) DO NOTHING;

-- Insert seats for event 2
INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status) VALUES
(2, 'A1', 'A', 'Premium', 199.99, 'AVAILABLE'),
(2, 'A2', 'A', 'Premium', 199.99, 'AVAILABLE'),
(2, 'B1', 'B', 'Standard', 89.99, 'AVAILABLE')
ON CONFLICT (event_id, seat_number) DO NOTHING;

SELECT setval('venues_id_seq', (SELECT MAX(id) FROM venues));
SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));


