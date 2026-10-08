-- Rotate the shared teacher code. Only the bcrypt hash is committed; the
-- plaintext lives with the teacher. One code unlocks lesson progress and the
-- behavior marble tracker.

update teacher_private.settings
set code_hash = '$2a$08$RdNkpCVamZq.TigfWPy/SeeVoacq74JVPxw.7rQY2d55z4o0bkhg.'
where id = 1;
