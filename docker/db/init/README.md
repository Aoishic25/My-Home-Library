Put your database seed file(s) here, e.g. `01-seed.sql`.

Files in this folder are gitignored on purpose (this repo is public, and the
seed dump contains your personal library data) — they're mounted into the
MySQL container's `/docker-entrypoint-initdb.d`, which auto-imports any
`.sql` file found here **the first time** the `db` container starts with an
empty data volume.

To generate a seed file from your current database:

```bash
mysqldump -h localhost -u root -p \
  --databases Shelf Collection Names Writer \
  --add-drop-database --add-drop-table --routines --triggers --single-transaction \
  > docker/db/init/01-seed.sql
```

To move to a new machine (e.g. Mac → Windows), copy this one file over
privately (USB, AirDrop, a cloud drive) alongside your `git clone` — it's a
few KB, not the whole project.
