import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';
import { timingSafeEqual } from 'node:crypto';
import { toIcs, type Issue } from './ics.ts';

// ponytail: first 250 only, add pagination if you ever have >250 open issues with due dates
const QUERY = `{
  viewer {
    assignedIssues(first: 250, filter: {
      dueDate: { null: false }
      state: { type: { nin: ["completed", "canceled"] } }
    }) { nodes { id identifier title dueDate url } }
  }
}`;

const tokenOk = (got = '') => {
  const a = Buffer.from(got);
  const b = Buffer.from(process.env.FEED_TOKEN!);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function handler(event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> {
  if (!tokenOk(event.queryStringParameters?.token)) return { statusCode: 404 };

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: process.env.LINEAR_API_KEY! },
    body: JSON.stringify({ query: QUERY }),
  });
  const json = (await res.json()) as { data?: { viewer: { assignedIssues: { nodes: Issue[] } } }; errors?: unknown };
  // Return 5xx on failure so the calendar keeps the previous feed instead of an empty one
  if (!res.ok || !json.data) {
    console.error(res.status, JSON.stringify(json.errors));
    return { statusCode: 502 };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
    body: toIcs(json.data.viewer.assignedIssues.nodes),
  };
}
