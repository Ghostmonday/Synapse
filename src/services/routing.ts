export async function routeIntent(intent: string): Promise<string> {
  // Stubbed router to keep offline determinism
  if (/design|ui/i.test(intent)) return "design";
  if (/api|backend/i.test(intent)) return "backend";
  return "general";
}

export function governanceVote(proposalId: string, vote: boolean): void {
  console.log(`Vote on ${proposalId}: ${vote}`);
}

