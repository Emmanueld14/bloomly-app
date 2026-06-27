-- Restore emoji card covers for CMS posts saved while the editor defaulted to
-- the text label "Bloomly".

update public.posts
set emoji = '💜'
where emoji is null
  or btrim(emoji) = ''
  or lower(btrim(emoji)) = 'bloomly';

notify pgrst, 'reload schema';
