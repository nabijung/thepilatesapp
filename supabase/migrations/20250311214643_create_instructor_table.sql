
create table if not exists instructor (
     id bigint primary key generated always as identity,
     first_name text not null,
     last_name text not null,
     email text not null,
     password text not null,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
);

create table if not exists student (
    id bigint primary key generated always as identity,
    first_name text not null,
    last_name text not null,
    email text not null,
    password text not null,
    age int,
    height int,
    weight int,
    pathologies text,
    occupation text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);