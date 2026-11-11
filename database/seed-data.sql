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

-- Generate concert seats for event 1 and 2
DO $$
DECLARE
    event_id_val INT;
    section_name TEXT;
    row_name TEXT;
    seat_num INT;
    section_price DECIMAL(10,2);
BEGIN
    -- Event 1 and 2 concert seating
    FOR event_id_val IN 1..2 LOOP
        -- VIP Section (8 rows x 10 seats)
        FOR row_name IN SELECT chr(i) FROM generate_series(65, 72) i LOOP
            FOR seat_num IN 1..10 LOOP
                INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status)
                VALUES (event_id_val, seat_num::TEXT, row_name, 'VIP', 350, 'AVAILABLE')
                ON CONFLICT (event_id, seat_number) DO NOTHING;
            END LOOP;
        END LOOP;

        -- Section A (8 rows x 12 seats)
        FOR row_name IN SELECT chr(i) FROM generate_series(65, 72) i LOOP
            FOR seat_num IN 1..12 LOOP
                INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status)
                VALUES (event_id_val, seat_num::TEXT, row_name, 'A', 200, 'AVAILABLE')
                ON CONFLICT (event_id, seat_number) DO NOTHING;
            END LOOP;
        END LOOP;

        -- Section B (8 rows x 12 seats)
        FOR row_name IN SELECT chr(i) FROM generate_series(65, 72) i LOOP
            FOR seat_num IN 1..12 LOOP
                INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status)
                VALUES (event_id_val, seat_num::TEXT, row_name, 'B', 150, 'AVAILABLE')
                ON CONFLICT (event_id, seat_number) DO NOTHING;
            END LOOP;
        END LOOP;

        -- Section C (8 rows x 12 seats)
        FOR row_name IN SELECT chr(i) FROM generate_series(65, 72) i LOOP
            FOR seat_num IN 1..12 LOOP
                INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status)
                VALUES (event_id_val, seat_num::TEXT, row_name, 'C', 120, 'AVAILABLE')
                ON CONFLICT (event_id, seat_number) DO NOTHING;
            END LOOP;
        END LOOP;

        -- Section D (8 rows x 14 seats)
        FOR row_name IN SELECT chr(i) FROM generate_series(65, 72) i LOOP
            FOR seat_num IN 1..14 LOOP
                INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status)
                VALUES (event_id_val, seat_num::TEXT, row_name, 'D', 80, 'AVAILABLE')
                ON CONFLICT (event_id, seat_number) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    -- Event 3: Simple general admission
    FOR seat_num IN 1..100 LOOP
        INSERT INTO seats (event_id, seat_number, row_label, zone, base_price, status)
        VALUES (3, seat_num::TEXT, 'GA', 'General', 75, 'AVAILABLE')
        ON CONFLICT (event_id, seat_number) DO NOTHING;
    END LOOP;
END $$;

SELECT setval('venues_id_seq', (SELECT MAX(id) FROM venues));
SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));


