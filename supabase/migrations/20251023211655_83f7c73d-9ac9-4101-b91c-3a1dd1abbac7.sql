-- Temporarily change the old user's email
UPDATE public.users 
SET email = 'old_' || email
WHERE id = '47394602-c92b-4429-8db5-b7805ec4289f';

-- Insert the correct user record with the auth ID
INSERT INTO public.users (id, email, full_name, role, team_id, created_at, updated_at)
VALUES (
  '7d9cb4eb-5f16-4153-b279-41bc0d70a66a',
  'jon@getclear.ca',
  'Jon Morrison',
  'owner',
  'e4ca5727-46f1-4310-8540-9dd11d8a136d',
  now(),
  now()
);

-- Update all related records to point to the correct auth user ID
UPDATE public.kpis 
SET owner_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE owner_id = '47394602-c92b-4429-8db5-b7805ec4289f';

UPDATE public.rocks 
SET owner_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE owner_id = '47394602-c92b-4429-8db5-b7805ec4289f';

UPDATE public.issues
SET owner_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE owner_id = '47394602-c92b-4429-8db5-b7805ec4289f';

UPDATE public.todos
SET owner_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE owner_id = '47394602-c92b-4429-8db5-b7805ec4289f';

UPDATE public.acknowledgements
SET user_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE user_id = '47394602-c92b-4429-8db5-b7805ec4289f';

UPDATE public.value_ratings
SET user_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE user_id = '47394602-c92b-4429-8db5-b7805ec4289f';

UPDATE public.user_tour_status
SET user_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE user_id = '47394602-c92b-4429-8db5-b7805ec4289f';

UPDATE public.user_preferences
SET user_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
WHERE user_id = '47394602-c92b-4429-8db5-b7805ec4289f';

-- Delete the old user record
DELETE FROM public.users 
WHERE id = '47394602-c92b-4429-8db5-b7805ec4289f';

-- Delete demo data
DELETE FROM public.kpi_readings 
WHERE kpi_id IN (
  SELECT id FROM public.kpis 
  WHERE id::text LIKE '10000000%'
);

DELETE FROM public.kpis 
WHERE id::text LIKE '10000000%';

DELETE FROM public.rocks 
WHERE id::text LIKE '10000000%';