-- Allow profile photos up to 50MB in the avatars storage bucket.

update storage.buckets
set file_size_limit = 52428800
where id = 'avatars';

notify pgrst, 'reload schema';
