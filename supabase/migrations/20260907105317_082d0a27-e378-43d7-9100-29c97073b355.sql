UPDATE public.lessons SET
  video_url = CASE WHEN video_url ~ '/storage/v1/object/(public|sign|authenticated)/course-media/'
    THEN 'course-media://' || split_part(substring(video_url from '/storage/v1/object/(?:public|sign|authenticated)/course-media/(.*)$'), '?', 1) ELSE video_url END,
  audio_url = CASE WHEN audio_url ~ '/storage/v1/object/(public|sign|authenticated)/course-media/'
    THEN 'course-media://' || split_part(substring(audio_url from '/storage/v1/object/(?:public|sign|authenticated)/course-media/(.*)$'), '?', 1) ELSE audio_url END,
  pdf_url = CASE WHEN pdf_url ~ '/storage/v1/object/(public|sign|authenticated)/course-media/'
    THEN 'course-media://' || split_part(substring(pdf_url from '/storage/v1/object/(?:public|sign|authenticated)/course-media/(.*)$'), '?', 1) ELSE pdf_url END,
  attachment_url = CASE WHEN attachment_url ~ '/storage/v1/object/(public|sign|authenticated)/course-media/'
    THEN 'course-media://' || split_part(substring(attachment_url from '/storage/v1/object/(?:public|sign|authenticated)/course-media/(.*)$'), '?', 1) ELSE attachment_url END;

UPDATE public.courses SET
  cover_url = CASE WHEN cover_url ~ '/storage/v1/object/(public|sign|authenticated)/course-media/'
    THEN 'course-media://' || split_part(substring(cover_url from '/storage/v1/object/(?:public|sign|authenticated)/course-media/(.*)$'), '?', 1) ELSE cover_url END,
  brochure_url = CASE WHEN brochure_url ~ '/storage/v1/object/(public|sign|authenticated)/course-media/'
    THEN 'course-media://' || split_part(substring(brochure_url from '/storage/v1/object/(?:public|sign|authenticated)/course-media/(.*)$'), '?', 1) ELSE brochure_url END;

UPDATE public.profiles SET
  avatar_url = CASE WHEN avatar_url ~ '/storage/v1/object/(public|sign|authenticated)/course-media/'
    THEN 'course-media://' || split_part(substring(avatar_url from '/storage/v1/object/(?:public|sign|authenticated)/course-media/(.*)$'), '?', 1) ELSE avatar_url END;