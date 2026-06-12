-- ═══════════════════════════════════════════════════════════════════════════
-- Data repair: Google's legacy gtv-videos-bucket went private (403), which
-- broke every mock/demo clip URL written before the provider fix — both in
-- generated_videos.url and baked into video_projects.timeline scenes.
-- Rewrite them to verified public clips (same set the mock provider now uses),
-- chosen deterministically by scene index.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.replacement_clip_url(idx int)
returns text
language sql
immutable
as $$
  select (array[
    'https://storage.googleapis.com/exoplayer-test-media-1/mp4/android-screens-10s.mp4',
    'https://storage.googleapis.com/exoplayer-test-media-1/mp4/android-screens-25s.mp4',
    'https://storage.googleapis.com/exoplayer-test-media-1/mp4/dizzy-with-tx3g.mp4'
  ])[(abs(coalesce(idx, 0)) % 3) + 1];
$$;

-- 1. Generated clips
update public.generated_videos
set url = public.replacement_clip_url(scene_index)
where url like '%gtv-videos-bucket%';

-- 2. Timelines (video_projects.timeline -> scenes[].clip_url)
update public.video_projects
set timeline = jsonb_set(
  timeline,
  '{scenes}',
  (
    select coalesce(
      jsonb_agg(
        case
          when scene ->> 'clip_url' like '%gtv-videos-bucket%' then
            jsonb_set(
              scene,
              '{clip_url}',
              to_jsonb(public.replacement_clip_url(coalesce((scene ->> 'index')::int, ord::int - 1)))
            )
          else scene
        end
        order by ord
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(timeline -> 'scenes') with ordinality as t(scene, ord)
  )
)
where jsonb_typeof(timeline -> 'scenes') = 'array'
  and timeline::text like '%gtv-videos-bucket%';

drop function public.replacement_clip_url(int);
