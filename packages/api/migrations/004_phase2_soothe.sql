-- Migration: 004_phase2_soothe.sql
-- Phase 2a: Smart Soothe Engine — techniques catalogue + feedback tracking

-- ─── Soothe Techniques Catalogue ────────────────────────────
CREATE TABLE IF NOT EXISTS soothe_techniques (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    need            TEXT NOT NULL,                    -- hungry | sleepy | diaper | pain | calm
    name            TEXT NOT NULL,
    description     TEXT,
    icon            TEXT,
    steps_json      JSONB NOT NULL,                   -- string[]
    timer_seconds   INT,                              -- NULL if no timer needed
    base_weight     FLOAT NOT NULL DEFAULT 1.0,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_soothe_techniques_need ON soothe_techniques(need);

-- ─── Soothe Feedback (parent outcomes) ──────────────────────
CREATE TABLE IF NOT EXISTS soothe_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    technique_id    UUID NOT NULL REFERENCES soothe_techniques(id),
    need            TEXT NOT NULL,
    outcome         TEXT NOT NULL CHECK (outcome IN ('success', 'fail')),
    duration_seconds INT,
    notes           TEXT,
    hour_of_day     INT NOT NULL,                     -- 0-23, for time-of-day scoring
    recorded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soothe_feedback_child_need ON soothe_feedback(child_id, need);
CREATE INDEX IF NOT EXISTS idx_soothe_feedback_child_tech ON soothe_feedback(child_id, technique_id);


-- ─── Seed: Hungry Techniques ────────────────────────────────

INSERT INTO soothe_techniques (need, name, description, icon, steps_json, timer_seconds, base_weight, sort_order) VALUES
('hungry', 'Feeding position', 'Try different feeding positions to find what works best for your baby.', '🤱', '["Choose a position: cradle hold, football hold, or side-lying", "Support baby''s head and neck gently", "Bring baby to breast/bottle (not the other way around)", "Ensure a good latch — lips flanged outward", "Listen for rhythmic swallowing sounds"]', NULL, 1.0, 1),

('hungry', 'Calm before feeding', 'Settle your baby before attempting to feed — a frantic baby may struggle to latch.', '😌', '["Hold baby skin-to-skin against your chest", "Speak softly or hum gently", "Rock slowly side-to-side at about 60 bpm", "Wait until crying settles to fussing or quiet alert", "Then begin the feeding attempt"]', 120, 0.9, 2),

('hungry', 'Skin-to-skin contact', 'Direct skin contact triggers feeding instincts and calms both parent and baby.', '🫶', '["Remove baby''s clothing down to diaper", "Place baby chest-to-chest against your bare skin", "Cover both of you with a warm blanket", "Let baby root and find the breast naturally", "Stay this way for at least 15–20 minutes"]', 900, 0.85, 3),

('hungry', 'Feed timer', 'Track feeding duration per side to ensure adequate intake.', '⏱️', '["Start timer when baby begins feeding", "Note which side you''re feeding on", "Aim for 10–15 minutes per side for breastfeeding", "Watch for slowing sucks — baby may be full", "Switch sides and restart timer if needed"]', 900, 0.8, 4);


-- ─── Seed: Sleepy Techniques ────────────────────────────────

INSERT INTO soothe_techniques (need, name, description, icon, steps_json, timer_seconds, base_weight, sort_order) VALUES
('sleepy', 'Darken the room', 'Darkness triggers melatonin production and signals that it''s time to sleep.', '🌙', '["Draw blackout curtains or blinds", "Turn off overhead lights", "Use a dim red/orange nightlight if needed", "Remove any blue-light sources (screens, LEDs)", "Keep the room comfortably cool (68–72°F / 20–22°C)"]', NULL, 1.0, 1),

('sleepy', 'White noise', 'Consistent background sound mimics the womb environment and masks startling noises.', '🔊', '["Open the Sleep Soundscape feature (or use a machine)", "Start with pink noise at moderate volume", "Place the sound source 6+ feet from baby", "Keep volume below 50 dB (conversation level)", "Let it run continuously through the sleep cycle"]', NULL, 0.95, 2),

('sleepy', 'Swaddle technique', 'A snug swaddle prevents the startle reflex from waking your baby.', '👶', '["Lay a blanket in a diamond shape, fold top corner down", "Place baby face-up with shoulders at the fold line", "Tuck baby''s right arm down, wrap right corner across and tuck", "Fold bottom corner up over the feet", "Tuck left arm down, wrap left corner across — snug but not tight", "Check: you should fit 2 fingers between blanket and chest"]', NULL, 0.9, 3),

('sleepy', 'Rock & pat at 60 bpm', 'Rhythmic movement at heartbeat pace is deeply calming for infants.', '🫳', '["Hold baby securely against your chest", "Rock gently side-to-side (not front-to-back)", "Pat baby''s bottom or back at about 60 bpm (1 per second)", "Keep movements smooth and rhythmic", "Gradually slow down as baby''s breathing steadies", "Transfer to crib once deeply asleep (limp arms test)"]', 300, 0.85, 4);


-- ─── Seed: Diaper Techniques ────────────────────────────────

INSERT INTO soothe_techniques (need, name, description, icon, steps_json, timer_seconds, base_weight, sort_order) VALUES
('diaper', 'Change station checklist', 'A calm, organized change prevents fussiness during the process.', '✅', '["Gather supplies before picking up baby: clean diaper, wipes, cream", "Lay baby on a warm, padded surface", "Open the dirty diaper but leave it under baby as a shield", "Wipe front to back (especially important for girls)", "Lift ankles gently to wipe the bottom", "Slide clean diaper under, fasten snugly at the hips"]', NULL, 1.0, 1),

('diaper', 'Distraction during change', 'A simple distraction keeps baby calm and cooperative during changes.', '🧸', '["Give baby a small toy or teether to hold", "Sing a short song or recite a rhyme — keep it consistent", "Maintain eye contact and narrate what you''re doing", "Try a mobile above the changing area for visual engagement", "Move quickly but gently — speed helps"]', NULL, 0.9, 2),

('diaper', 'Barrier cream', 'A thin layer of barrier cream prevents and heals diaper rash.', '🧴', '["Clean the area thoroughly and pat completely dry", "Apply a thin layer of zinc oxide cream", "Cover the entire diaper area, including creases", "Let it dry for a moment before closing the diaper", "Reapply at every change if rash is present"]', NULL, 0.85, 3),

('diaper', 'Air time', 'Letting baby go diaper-free helps heal rashes and keeps skin healthy.', '💨', '["Place a waterproof pad or old towel on floor", "Remove the diaper and let baby lie on the pad", "Stay close — accidents happen!", "Aim for 3–5 minutes of diaper-free time", "Great after baths or during tummy time"]', 300, 0.8, 4);


-- ─── Seed: Pain Techniques ──────────────────────────────────

INSERT INTO soothe_techniques (need, name, description, icon, steps_json, timer_seconds, base_weight, sort_order) VALUES
('pain', 'Source check', 'Before soothing, check for common pain sources that need attention.', '🔍', '["Check temperature — feel baby''s chest (not hands/feet)", "Look in the mouth — swollen, white gums may mean teething", "Check fingers and toes for hair tourniquets (wrapped hair)", "Feel the belly — hard or distended may mean gas", "Check for skin irritation, scratches, or bug bites", "If fever > 100.4°F (38°C) in infant < 3 months — call doctor immediately"]', NULL, 1.0, 1),

('pain', 'Bicycle legs for gas', 'Gentle leg cycling helps release trapped gas and relieves colic discomfort.', '🚴', '["Lay baby on their back on a flat surface", "Gently hold both ankles", "Push right knee toward chest, then extend", "Push left knee toward chest, then extend", "Alternate in a slow cycling motion for 1–2 minutes", "Pause if baby passes gas — it''s working!", "Follow with gentle clockwise belly massage"]', 120, 0.95, 2),

('pain', 'Chest-to-chest hold', 'Skin-to-skin contact releases oxytocin in both parent and baby, reducing pain perception.', '🤗', '["Remove your shirt and baby''s clothing (diaper stays on)", "Hold baby upright against your bare chest", "Support the head and neck with one hand", "Cover both of you with a soft blanket", "Breathe slowly — your calm heartbeat soothes baby", "Stay in this position for 15–30 minutes"]', 900, 0.9, 3),

('pain', 'When to call the doctor', 'Know the warning signs that need professional medical attention.', '🏥', '["Fever ≥ 100.4°F (38°C) in babies under 3 months — call NOW", "Inconsolable crying for 3+ hours despite all soothing attempts", "Vomiting and refusing feeds for more than 6 hours", "Unusual lethargy — difficult to wake or no interest in surroundings", "Rash that doesn''t blanch (fade) when pressed", "Trust your instincts — if something feels wrong, call"]', NULL, 0.7, 4);


-- ─── Seed: Calm Techniques ──────────────────────────────────

INSERT INTO soothe_techniques (need, name, description, icon, steps_json, timer_seconds, base_weight, sort_order) VALUES
('calm', 'Tummy time', 'Supervised tummy time builds neck and core strength during alert, happy periods.', '💪', '["Place baby on a firm, flat surface on their tummy", "Start with 3–5 minutes, building up gradually", "Get down to eye level and talk or sing to baby", "Place a colorful toy just out of reach for motivation", "Support under the chest with a rolled towel if needed", "Stop if baby becomes fussy — you can try again later"]', 300, 1.0, 1),

('calm', 'Talk & sing', 'Your voice is your baby''s favorite sound — language exposure during calm times builds connection.', '🎵', '["Face your baby at close range (8–12 inches)", "Talk about what you see, what you''re doing, how you feel", "Use a higher-pitched, sing-song voice (''parentese'')", "Pause and wait — let baby ''respond'' with coos or expressions", "Sing a simple song or rhyme — repetition is great", "Narrate their world: ''Look at the light! So bright!''"]', NULL, 0.95, 2),

('calm', 'High-contrast visuals', 'Newborns see best in high contrast — bold patterns stimulate visual development.', '🎯', '["Hold a black-and-white pattern card 8–12 inches from baby''s face", "Move it slowly to the left, then right — watch baby''s eyes track", "Try different patterns: stripes, circles, checkerboard", "Use a high-contrast mobile above the crib", "Tummy time + contrast cards = double developmental win"]', NULL, 0.85, 3),

('calm', 'Smile mirroring', 'Face-to-face interaction during calm moments builds social cognition and emotional connection.', '😊', '["Get close — babies see best at 8–12 inches", "Make exaggerated facial expressions — big smiles, wide eyes", "Copy baby''s expressions back to them (mirroring)", "Stick out your tongue slowly — many newborns will copy!", "Play peek-a-boo with your hands or a cloth", "Enjoy these moments — they''re building your bond"]', NULL, 0.8, 4);
