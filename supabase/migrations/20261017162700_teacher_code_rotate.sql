-- Rotate the shared teacher code. Only the bcrypt hash is committed; the
-- plaintext lives with the teacher. One code unlocks lesson progress and the
-- behavior marble tracker.

update teacher_private.settings
set code_hash = '$2a$08$fXBQGnqFsbGt7zD15GX6tekgn66qQk6MptpMFg7WWAX2xHVlYpuuG'
where id = 1;
