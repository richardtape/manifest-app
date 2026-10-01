-- OUR SERVER'S STORAGE (Decision 2). Applied at every start, so every statement is idempotent. An existing
-- table keeps the definition it was made with: migrate.ts brings an older file up to this one (F3 Decision 12).
-- Decision 1: no credential is ever a column here. A conversation's token and a model key live
-- in memory only; db.test.ts and conversations.test.ts dump every table to hold it.
-- THE ONE EXCEPTION IS F6's D2 (Rich): `watch_tokens.sealed`, a Keeping watch token sealed with
-- AES-256-GCM, whose key is never in this file or beside it (keeping/seal.ts). Never in the clear.

create table if not exists persons (
  id text primary key,                 -- Me.id, from getMe (FE-2)
  display_name text not null,
  seen_at text not null,
  email text,                          -- F6: Me.email, for "your work is waiting"; an address is not a credential
  here_at text,                        -- F6 Decision 7: the last page load we heard of
  last_here text                       -- F6 Decision 7: when their previous visit ended
);

create table if not exists conversations (
  id text primary key,
  person_id text not null references persons (id),
  project_id text,                     -- null until moment 4 makes the project
  title text not null,
  state text not null check (state in (
    'describing', 'questions', 'naming', 'making', 'planning', 'plan-ready', 'agreed', 'building', 'built',
    'paused', 'failed', 'waiting', 'set-aside'
  )),
  description text not null,           -- the person's own words, verbatim
  created_at text not null,
  updated_at text not null,
  waiting_since text                   -- F4 Decision 5: its place in the app's line; null unless waiting
);
create index if not exists conversations_by_person on conversations (person_id);
create index if not exists conversations_by_project on conversations (project_id, state);

create table if not exists messages (
  conversation_id text not null references conversations (id),
  seq integer not null,
  sender text not null check (sender in ('person', 'we')),
  body text not null,                  -- our structured JSON, never a model's free text
  at text not null,
  primary key (conversation_id, seq)
);

create table if not exists plans (
  conversation_id text not null references conversations (id),
  version integer not null,
  body text not null,
  at text not null,
  primary key (conversation_id, version)
);

-- Decision 11: what a person was shown a support reference for. Never a platform message.
create table if not exists problems (
  reference text primary key,          -- 'XXXX-XXXX'
  code text not null,
  at text not null,
  place text not null check (place in ('server', 'browser')),
  operation text,
  status integer,
  person_id text,
  conversation_id text,
  platform_request_id text             -- FE-30: null until the platform answers one
);

-- F3 Decision 10: a round's run, saved after every move, so it pauses and resumes. An agent session is
-- kept by its id, NEVER its key. `last` is the lead's last move and what it was told.
create table if not exists runs (
  id text primary key,
  conversation_id text not null references conversations (id),
  round integer not null,
  step text not null,
  moves integer not null,              -- in this step
  tries text not null,                 -- JSON: each kind of try's count (Decision 7)
  status text not null check (status in (
    'working', 'paused', 'needs-you', 'stopped', 'interrupted', 'done'
  )),
  session_ids text not null,           -- JSON: the agent sessions' ids
  model text,
  last text,                           -- JSON { kind, report }
  same_refusal text,                   -- JSON { reason, count }
  created_at text not null,
  updated_at text not null,
  detail text                          -- JSON: the round's own facts (F3 Task 8); null before version 3
);
create index if not exists runs_by_conversation on runs (conversation_id, round);

-- F3 Decision 10: what happened in a run, never what was said: no prompt's text, no file's content, and
-- nothing shaped like a credential (the store refuses one).
create table if not exists trace (
  run_id text not null,
  seq integer not null,
  at text not null,
  entry text not null,                 -- JSON: a model call, a move and its guard's verdict, a platform call
  primary key (run_id, seq)
);

-- F3 Decision 10: each question a round asked, its default, and its answer. A SECRET'S ANSWER IS NEVER STORED:
-- it goes to the sandbox (setAppSecret) and is dropped, so a secret's row says only that it was answered.
create table if not exists questions (
  id text primary key,
  run_id text not null,
  conversation_id text not null references conversations (id),
  ask text not null,
  fallback text,                       -- the default the work went on with; null when it waits
  secret text,                         -- the name the app reads it by; null for a question in words
  answer text,                         -- a default until they answer; never a secret's
  answered_at text,
  asked_at text not null
);
create index if not exists questions_by_run on questions (run_id, asked_at);

-- F6 Decision 3: the apps the keeper watches, and their members, kept: an archived app has no
-- token to ask with, and its history must still answer its members after a restart.
create table if not exists apps (
  project_id text primary key,
  name text not null,
  slug text not null,
  state text not null check (state in ('active', 'archived')),
  launched_at text,
  students_url text,                   -- production's Environment.url; null before a deploy
  read_at text not null
);
create table if not exists members (
  project_id text not null,
  user_id text not null,
  role text not null check (role in ('owner', 'collaborator')),
  display_name text not null,
  email text not null,                 -- an address is not a credential
  primary key (project_id, user_id)
);

-- D2: THE ONE CREDENTIAL AT REST, SEALED (AES-256-GCM); its key is never in .data/.
create table if not exists watch_tokens (
  project_id text primary key,
  token_id text not null,
  sealed text not null,
  expires_at text not null,
  minted_by text not null,
  minted_at text not null
);

-- What the keeper saw, as the platform sent it, and its own outages and gaps (F6 Decision 1).
create table if not exists history (
  id text primary key,
  project_id text not null,
  at text not null,
  type text not null,
  detail text not null
);
create index if not exists history_by_project on history (project_id, at);

-- D3: one email per happening and recipient.
create table if not exists emails (
  kind text not null check (kind in ('trouble', 'waiting', 'over', 'people')),
  happening text not null,             -- starts with its project id: '<projectId>:<what>'
  recipient text not null,             -- the address
  subject text not null,               -- kept, so a restart can finish what it claimed (Review Focus 1)
  body text not null,
  state text not null check (state in ('sending', 'sent', 'failed')),
  tries integer not null,
  at text not null,
  primary key (kind, happening, recipient)
);
