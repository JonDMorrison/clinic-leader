
-- Update branding to point to the new Northwest Injury Clinics org
UPDATE branding 
SET organization_id = 'e4ca5727-46f1-4310-8540-9dd11d8a136d',
    updated_at = now()
WHERE subdomain = 'northwest';

-- Delete the old empty Northwest org
DELETE FROM teams WHERE id = '00000000-0000-0000-0000-000000000001';

-- Also clean up the old license for that org
DELETE FROM licenses WHERE organization_id = '00000000-0000-0000-0000-000000000001';

-- Clean up old departments for that org
DELETE FROM departments WHERE organization_id = '00000000-0000-0000-0000-000000000001';
