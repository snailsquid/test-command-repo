-- Add manifest_version column
ALTER TABLE `commands` ADD `manifest_version` text;

-- 1.3 Add unique index on (repoUrl, slug) - slug uniqueness is per-repository
CREATE UNIQUE INDEX IF NOT EXISTS `commands_repo_url_slug_unique` ON `commands` (`repo_url`, `slug`);