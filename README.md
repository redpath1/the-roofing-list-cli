# theroofinglist

Find checked US roofing, siding and gutter contractors by city, from your terminal. It is free. You do not need an API key.

The data comes from [The Roofing List](https://theroofinglist.com). It lists only open businesses that passed our contact check. Ratings come from reviews published on The Roofing List only. They never come from Google or other sites.

## Install

You need Node 20 or later.

```bash
npm install -g theroofinglist
```

Or run it once without an install:

```bash
npx theroofinglist search --trade roofing --city Austin --state TX
```

The package gives you two names for the same command: `theroofinglist` and `roofers`.

## Search a city

```bash
theroofinglist search --trade roofing --city Austin --state TX --limit 3
```

```
3 roofing contractors in Austin, TX

21st Century Painting, Roofing, & Siding of Austin  |  (512) 219-0342  |  no reviews  |  https://theroofinglist.com/roofers/texas/austin/21st-century-painting-roofing-siding-of-austin/
511 Roofing  |  (512) 947-4417  |  no reviews  |  https://theroofinglist.com/roofers/texas/austin/511-roofing/
512ROOFS.COM  |  (512) 777-9795  |  no reviews  |  https://theroofinglist.com/roofers/texas/austin/512roofs-com/
```

- `--trade` is `roofing`, `siding` or `gutters`.
- `--state` takes a code (`TX`) or a full name (`Texas`).
- `--limit` is 1 to 25. The default is 10.

Each row shows the name, phone, rating, a `claimed` tag when the business has claimed its profile, and the profile link. When nothing matches, you see "No listed contractors match."

## Get one contractor

Use an id from a search:

```bash
theroofinglist get 1
```

```
Name:    21st Century Painting, Roofing, & Siding of Austin
Trades:  roofing, siding, gutters
City:    Austin, TX
Phone:   (512) 219-0342
Website: none listed
Rating:  no reviews
Claimed: no
Profile: https://theroofinglist.com/roofers/texas/austin/21st-century-painting-roofing-siding-of-austin/
```

## JSON output

Add `--json` to get the raw API answer. Pipe it to `jq` or another tool:

```bash
theroofinglist search --trade gutters --city Denver --state CO --json \
  | jq -r '.contractors[] | [.name, .phone] | @tsv'
```

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success. An empty search is a success too. |
| 1 | The API sent an error, or the network failed. The message goes to stderr. When you hit the rate limit, the message says how long to wait. |
| 2 | Usage error, such as an unknown trade or a missing option. |

## Data and terms

- About the data and the API: https://theroofinglist.com/mcp/
- Terms: https://theroofinglist.com/terms/

The same data is also available as:

- an MCP server for AI agents: `https://mcp.theroofinglist.com/mcp`
- a REST API. The OpenAPI spec is at https://mcp.theroofinglist.com/openapi.json

The API is rate-limited. Please keep scripts gentle.

## Public repository

https://github.com/redpath1/the-roofing-list-cli is the published copy of the `cli/` folder in the private monorepo of The Roofing List. Develop in the monorepo. The public repo has its own short history, so do not use `git subtree push`: that would push the monorepo's commit history, with its author emails, to the public repo. After a change to `cli/` merges to `main`, copy the files instead:

```bash
git clone https://github.com/redpath1/the-roofing-list-cli /tmp/trl-cli
rsync -a --delete --exclude .git --exclude node_modules cli/ /tmp/trl-cli/
cd /tmp/trl-cli && git add -A && git commit -m "<what changed>" && git push
```

Commit as `Keith Evans <272994924+redpath1@users.noreply.github.com>`. No personal email goes into the public history.

## Develop

No dependencies, no build step.

```bash
npm test
```

Set `THEROOFINGLIST_API` to point the CLI at another server, for example a local one.

## License

MIT. See [LICENSE](LICENSE).
