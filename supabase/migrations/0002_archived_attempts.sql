-- "Reset a period" from the grown-up corner keeps the books in the library but takes them
-- off the current rocket. Archived attempts no longer count toward the goal.
alter table attempts add column if not exists archived boolean not null default false;
