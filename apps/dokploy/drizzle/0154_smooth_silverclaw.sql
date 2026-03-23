ALTER TABLE "webServerSettings" ADD COLUMN "swarmDefaultsConfig" jsonb DEFAULT '{"placementConstraints":[]}'::jsonb NOT NULL;
