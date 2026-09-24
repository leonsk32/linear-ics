# linear-ics

Shows due dates of Linear issues assigned to you in a dedicated Google Calendar, via an iCal feed served by AWS Lambda.

Every time the feed is fetched, it pulls all of your open issues that have a due date from Linear. Changed or removed due dates and completed or canceled issues therefore update on the calendar's next refresh.

## Prerequisites

- Node.js 24+
- pnpm
- AWS credentials configured for the target account

## Deploy

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create `.env` from the example and fill it in:

   ```sh
   cp .env.example .env
   ```

   - `LINEAR_API_KEY`: create one in Linear → Settings → Security & access → Personal API keys. The **Read** permission is enough. If you limit team access, only issues from those teams appear.
   - `FEED_TOKEN`: a random secret, e.g. `openssl rand -hex 24`

3. Bootstrap CDK (only once per account/region):

   ```sh
   pnpm cdk bootstrap
   ```

4. Deploy:

   ```sh
   pnpm run deploy
   ```

   The `SubscribeUrl` output is your feed URL.

5. In Google Calendar, go to **Other calendars → + → From URL** and paste the `SubscribeUrl`.

## Notes

- Google Calendar refreshes subscribed calendars only every few hours to a day, and you can't make it refresh sooner.
- Anyone with the URL can read the feed. If it leaks, change `FEED_TOKEN`, redeploy, and subscribe again with the new URL.
- The secrets are stored as Lambda environment variables.
- Only the first 250 issues are fetched.

## Development

```sh
pnpm test       # ICS generation test
pnpm typecheck
```
