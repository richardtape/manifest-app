-- OUR SERVER'S STORAGE (Decision 2). Applied at every start, so every statement is idempotent. An existing
-- table keeps the definition it was made with: migrate.ts brings an older file up to this one (F3 Decision 12).
-- Decision 1: no credential is ever a column here. A conversation's token and a model key live
-- in memory only; db.test.ts and conversations.test.ts dump every table to hold it.

create table if not exists persons (
  id text primary key,                 -- Me.id, from getMe (FE-2)
  display_name text not null,
  seen_at text not null
);

create table if not exists conversations (
  id text primary key,
  person_id text not null references persons (id),
  project_id text,                     -- null until moment 4 makes the project
  title text not null,
  state text not null check (state in (
    'describing', 'questions', 'naming', 'making', 'planning', 'plan-ready', 'agreed', 'building', 'built',
    'paused', 'failed'
  )),
  description text not null,           -- the person's own words, verbatim
  created_at text not null,
  updated_at text not null
);
create index if not exists conversations_by_person on conversations (person_id);

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
