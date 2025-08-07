-- Set assistance-photos bucket to private (no policy changes)
update storage.buckets
set public = false
where id = 'assistance-photos';