import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';
import { timingSafeEqual } from 'node:crypto';
import { toIcs, type Issue } from './ics.ts';

// ponytail: first 250 only, add pagination if you ever have >250 open issues with due dates
const QUERY = `{
  viewer {
    assignedIssues(first: 250, filter: {
      dueDate: { null: false }
      state: { type: { nin: ["completed", "canceled"] } }
    }) { nodes { id identifier title dueDate url priority } }
  }
}`;

// Both return null on failure
async function linear(): Promise<Issue[] | null> {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: process.env.LINEAR_API_KEY! },
    body: JSON.stringify({ query: QUERY }),
  });
  const json = (await res.json()) as { data?: { viewer: { assignedIssues: { nodes: Issue[] } } }; errors?: unknown };
  if (!res.ok || !json.data) {
    console.error('linear', res.status, JSON.stringify(json.errors));
    return null;
  }
  return json.data.viewer.assignedIssues.nodes;
}

type TodoistTask = { id: string; content: string; priority: number; due: { date: string } | null };

async function todoist(): Promise<Issue[] | null> {
  const tasks: TodoistTask[] = [];
  let cursor: string | null = null;
  do {
    const qs = new URLSearchParams({ query: '!no date', limit: '200', ...(cursor && { cursor }) });
    const res = await fetch(`https://api.todoist.com/api/v1/tasks/filter?${qs}`, {
      headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
    });
    if (!res.ok) {
      console.error('todoist', res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { results: TodoistTask[]; next_cursor: string | null };
    tasks.push(...json.results);
    cursor = json.next_cursor;
  } while (cursor);

  return tasks
    .filter((t) => t.due)
    .map((t) => ({
      id: `todoist-${t.id}`,
      title: t.content,
      dueDate: t.due!.date.slice(0, 10), // timed tasks become all-day
      url: `https://app.todoist.com/app/task/${t.id}`,
      // Todoist priority: 4 = p1 (highest) … 1 = p4 (none) → Linear scale
      priority: t.priority === 1 ? 0 : 5 - t.priority,
    }));
}

const tokenOk = (got = '') => {
  const a = Buffer.from(got);
  const b = Buffer.from(process.env.FEED_TOKEN!);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function handler(event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> {
  const q = event.queryStringParameters ?? {};
  if (!tokenOk(q.token)) return { statusCode: 404 };
  const isTodoist = q.source === 'todoist';
  // One line per fetch, to see how often each calendar refreshes
  console.log('fetch', isTodoist ? 'todoist' : 'linear', event.headers?.['user-agent']);
  if (isTodoist && !process.env.TODOIST_API_TOKEN) return { statusCode: 404 };

  const items = await (isTodoist ? todoist() : linear());
  // Return 5xx on failure so the calendar keeps the previous feed instead of an empty one
  if (!items) return { statusCode: 502 };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
    body: toIcs(items, new Date(), isTodoist ? 'Todoist 期限' : 'Linear 期限'),
  };
}
