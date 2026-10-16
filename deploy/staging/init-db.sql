\set ON_ERROR_STOP on
-- psql reads the mounted secret; no password value lives in this file.
\set app_password `cat /run/secrets/DB_PASSWORD`
CREATE ROLE bubble_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'app_password';
CREATE DATABASE bubble_staging OWNER bubble_app;
REVOKE ALL ON DATABASE bubble_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE bubble_staging TO bubble_app;
