-- OUR SERVER'S STORAGE (Decision 2). Applied at every start, so every statement is idempotent.
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
    'describing', 'questions', 'naming', 'making', 'planning', 'plan-ready', 'agreed', 'paused', 'failed'
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
