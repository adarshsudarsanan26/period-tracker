-- Clean tables
DELETE FROM lifestyle_logs;
DELETE FROM symptoms;
DELETE FROM moods;
DELETE FROM periods;
DELETE FROM users;

-- Seed default users (adarsh, testuser, and test@example.com)
INSERT INTO users (id, username, password_hash, name, default_cycle_length, default_period_duration) VALUES 
(1, 'adarsh', 'fc57ecc241762295b76dc1f7a9a01a9a3dad76f4473880eb48fa191727099214', 'Adarsh', 28, 5),
(2, 'testuser', 'b34b4d5644dfa9da38d6e38261ff8423131f66cfa4d43beaa28c310f3f4f6480', 'Test User', 28, 5),
(3, 'test@example.com', 'aa95ecdc9ba09fb7a564c8afb4653438dc338cd17859a341c5fbb55d768222f2', 'Test User E', 28, 5);

-- Seed period cycles
INSERT INTO periods (id, user_id, start_date, end_date, status) VALUES 
(1, 1, '2026-03-10', '2026-03-14', 'COMPLETED'),
(2, 1, '2026-04-07', '2026-04-11', 'COMPLETED'),
(3, 1, '2026-05-05', '2026-05-09', 'COMPLETED'),
(4, 1, '2026-06-02', '2026-06-06', 'COMPLETED'),
(5, 2, '2026-03-10', '2026-03-14', 'COMPLETED'),
(6, 2, '2026-04-07', '2026-04-11', 'COMPLETED'),
(7, 2, '2026-05-05', '2026-05-09', 'COMPLETED'),
(8, 2, '2026-06-02', '2026-06-06', 'COMPLETED');

-- Seed moods and notes
INSERT INTO moods (id, user_id, mood_date, mood, notes) VALUES
(1, 1, '2026-06-02', '😊', 'Cycle started. Felt relieved but slightly tired.'),
(2, 1, '2026-06-03', '😔', 'June 3 - Became very sensitive and avoided calls.'),
(3, 1, '2026-06-04', '😐', 'Working from home. Normal day.'),
(4, 1, '2026-06-05', '😴', 'Fatigued but mood is improving.'),
(5, 1, '2026-06-06', '😊', 'Energy is back. Had a nice walk outside.'),
(6, 1, '2026-06-08', '😊', 'Productive day at work.'),
(7, 1, '2026-05-01', '😡', 'Felt very irritable today for no reason.'),
(8, 1, '2026-05-02', '🤐', 'Just wanted some quiet space today.'),
(9, 1, '2026-05-03', '😔', 'Emotional exhaustion.'),
(10, 1, '2026-06-26', '😡', 'Agitated by small things.'),
(11, 1, '2026-06-27', '🤐', 'Decided to stay in bed and read.'),
-- Duplicate for user_id = 2
(12, 2, '2026-06-02', '😊', 'Cycle started. Felt relieved but slightly tired.'),
(13, 2, '2026-06-03', '😔', 'June 3 - Became very sensitive and avoided calls.'),
(14, 2, '2026-06-04', '😐', 'Working from home. Normal day.'),
(15, 2, '2026-06-05', '😴', 'Fatigued but mood is improving.'),
(16, 2, '2026-06-06', '😊', 'Energy is back. Had a nice walk outside.'),
(17, 2, '2026-06-08', '😊', 'Productive day at work.'),
(18, 2, '2026-05-01', '😡', 'Felt very irritable today for no reason.'),
(19, 2, '2026-05-02', '🤐', 'Just wanted some quiet space today.'),
(20, 2, '2026-05-03', '😔', 'Emotional exhaustion.'),
(21, 2, '2026-06-26', '😡', 'Agitated by small things.'),
(22, 2, '2026-06-27', '🤐', 'Decided to stay in bed and read.');

-- Seed symptoms
INSERT INTO symptoms (id, user_id, symptom_date, symptom) VALUES
-- June active symptoms (user 1)
(1, 1, '2026-06-02', 'Cramps'),
(2, 1, '2026-06-02', 'Fatigue'),
(3, 1, '2026-06-03', 'Headache'),
(4, 1, '2026-06-03', 'Fatigue'),
(5, 1, '2026-06-03', 'Bloating'),
(6, 1, '2026-06-04', 'Cramps'),
(7, 1, '2026-06-05', 'Fatigue'),
(8, 1, '2026-04-03', 'Anger'),
(9, 1, '2026-05-01', 'Anger'),
(10, 1, '2026-05-29', 'Anger'),
(11, 1, '2026-04-04', 'Silent behavior'),
(12, 1, '2026-05-02', 'Silent behavior'),
(13, 1, '2026-05-30', 'Silent behavior'),
(14, 1, '2026-04-02', 'Crying easily'),
(15, 1, '2026-04-05', 'Crying easily'),
(16, 1, '2026-05-01', 'Crying easily'),
(17, 1, '2026-05-04', 'Crying easily'),
(18, 1, '2026-05-28', 'Crying easily'),
(19, 1, '2026-05-31', 'Crying easily'),
-- Duplicate for user_id = 2
(20, 2, '2026-06-02', 'Cramps'),
(21, 2, '2026-06-02', 'Fatigue'),
(22, 2, '2026-06-03', 'Headache'),
(23, 2, '2026-06-03', 'Fatigue'),
(24, 2, '2026-06-03', 'Bloating'),
(25, 2, '2026-06-04', 'Cramps'),
(26, 2, '2026-06-05', 'Fatigue'),
(27, 2, '2026-04-03', 'Anger'),
(28, 2, '2026-05-01', 'Anger'),
(29, 2, '2026-05-29', 'Anger'),
(30, 2, '2026-04-04', 'Silent behavior'),
(31, 2, '2026-05-02', 'Silent behavior'),
(32, 2, '2026-05-30', 'Silent behavior'),
(33, 2, '2026-04-02', 'Crying easily'),
(34, 2, '2026-04-05', 'Crying easily'),
(35, 2, '2026-05-01', 'Crying easily'),
(36, 2, '2026-05-04', 'Crying easily'),
(37, 2, '2026-05-28', 'Crying easily'),
(38, 2, '2026-05-31', 'Crying easily');

-- Seed lifestyle logs
INSERT INTO lifestyle_logs (id, user_id, log_date, sleep_quality, sleep_duration, water_intake, exercise_duration, walking_steps, stress_level, workload, diet_quality, caffeine_intake, alcohol_intake, energy_level) VALUES
(1, 1, '2026-05-01', 'Poor', 5.0, 1.2, 0, 3000, 4, 4, 'Fair', 3, 0, 2),
(2, 1, '2026-05-29', 'Poor', 4.5, 1.0, 0, 2500, 5, 5, 'Poor', 4, 1, 1),
(3, 1, '2026-04-03', 'Poor', 5.0, 1.5, 10, 4000, 4, 4, 'Fair', 3, 0, 2),
(4, 1, '2026-05-02', 'Good', 7.5, 2.0, 30, 8000, 2, 2, 'Good', 1, 0, 4),
(5, 1, '2026-05-30', 'Good', 8.0, 2.2, 20, 7000, 1, 2, 'Good', 1, 0, 4),
(6, 1, '2026-04-04', 'Good', 7.0, 2.0, 15, 6000, 2, 3, 'Good', 2, 0, 3),
(7, 1, '2026-06-02', 'Fair', 6.5, 1.8, 0, 5000, 3, 3, 'Fair', 2, 0, 3),
(8, 1, '2026-06-03', 'Poor', 5.5, 1.5, 0, 3500, 4, 4, 'Fair', 3, 0, 2),
(9, 1, '2026-06-04', 'Good', 7.0, 2.0, 20, 6500, 2, 2, 'Good', 1, 0, 3),
(10, 1, '2026-06-05', 'Good', 7.2, 2.2, 30, 8500, 1, 1, 'Good', 1, 0, 4),
-- Duplicate for user_id = 2
(11, 2, '2026-05-01', 'Poor', 5.0, 1.2, 0, 3000, 4, 4, 'Fair', 3, 0, 2),
(12, 2, '2026-05-29', 'Poor', 4.5, 1.0, 0, 2500, 5, 5, 'Poor', 4, 1, 1),
(13, 2, '2026-04-03', 'Poor', 5.0, 1.5, 10, 4000, 4, 4, 'Fair', 3, 0, 2),
(14, 2, '2026-05-02', 'Good', 7.5, 2.0, 30, 8000, 2, 2, 'Good', 1, 0, 4),
(15, 2, '2026-05-30', 'Good', 8.0, 2.2, 20, 7000, 1, 2, 'Good', 1, 0, 4),
(16, 2, '2026-04-04', 'Good', 7.0, 2.0, 15, 6000, 2, 3, 'Good', 2, 0, 3),
(17, 2, '2026-06-02', 'Fair', 6.5, 1.8, 0, 5000, 3, 3, 'Fair', 2, 0, 3),
(18, 2, '2026-06-03', 'Poor', 5.5, 1.5, 0, 3500, 4, 4, 'Fair', 3, 0, 2),
(19, 2, '2026-06-04', 'Good', 7.0, 2.0, 20, 6500, 2, 2, 'Good', 1, 0, 3),
(20, 2, '2026-06-05', 'Good', 7.2, 2.2, 30, 8500, 1, 1, 'Good', 1, 0, 4);

-- Synchronize H2 primary key auto-increment sequences after seeding
ALTER TABLE users ALTER COLUMN id RESTART WITH 4;
ALTER TABLE periods ALTER COLUMN id RESTART WITH 9;
ALTER TABLE moods ALTER COLUMN id RESTART WITH 23;
ALTER TABLE symptoms ALTER COLUMN id RESTART WITH 39;
ALTER TABLE lifestyle_logs ALTER COLUMN id RESTART WITH 21;
