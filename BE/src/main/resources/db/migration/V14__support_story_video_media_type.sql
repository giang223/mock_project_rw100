ALTER TABLE stories
    ADD COLUMN media_type VARCHAR(10) NULL AFTER media_url;

UPDATE stories
SET media_type = 'IMAGE'
WHERE media_url IS NOT NULL;
