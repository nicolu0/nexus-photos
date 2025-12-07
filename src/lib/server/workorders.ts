// src/lib/server/workorders.ts

export async function updateWorkordersForUser(
  supabase: SupabaseClient,
  userId: string
) {
  // 1) load gmail_tokens for userId
	const { data, error } = await supabase
		.from('gmail_tokens')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();
  // 2) call Gmail, get new messages
  // 3) call OpenAI on each new email
  // 4) insert workorders into DB
  // 5) return whatever you want (e.g. inserted rows)
}
