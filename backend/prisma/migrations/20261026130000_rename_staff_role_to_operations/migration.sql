-- The STAFF role is renamed OPERATIONS. Users point at their role by id, so a
-- rename keeps everyone's role. If the seed already created an OPERATIONS row,
-- STAFF users move onto it and the STAFF row goes.
UPDATE "users" u
SET "roleId" = o."id"
FROM "roles" s, "roles" o
WHERE s."name" = 'STAFF'
  AND o."name" = 'OPERATIONS'
  AND u."roleId" = s."id";

DELETE FROM "role_permissions" rp
USING "roles" s
WHERE s."name" = 'STAFF'
  AND rp."roleId" = s."id"
  AND EXISTS (SELECT 1 FROM "roles" o WHERE o."name" = 'OPERATIONS');

DELETE FROM "roles" s
WHERE s."name" = 'STAFF'
  AND EXISTS (SELECT 1 FROM "roles" o WHERE o."name" = 'OPERATIONS');

UPDATE "roles"
SET "name" = 'OPERATIONS', "description" = 'Platform operations'
WHERE "name" = 'STAFF';

-- activity log rows copy the actor's role name; keep old rows readable under the new name
UPDATE "activity_logs"
SET "actorRole" = 'OPERATIONS'
WHERE "actorRole" = 'STAFF';
