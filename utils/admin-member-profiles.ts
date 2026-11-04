/** Keep available contact fields when an older users schema lacks one optional column. */
export type AdminMemberProfile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
};

type ProfileQueryError = {
  code?: string;
  message?: string;
  details?: string;
};

type ProfileQueryResult = {
  data: AdminMemberProfile[] | null;
  error: ProfileQueryError | null;
};

type ProfileClient = {
  from: (table: string) => {
    select: (columns: string) => PromiseLike<ProfileQueryResult>;
  };
};

const PROFILE_COLUMNS = ['id', 'full_name', 'name', 'phone', 'address'] as const;

const getMissingOptionalColumn = (
  error: ProfileQueryError,
  columns: readonly string[]
) => {
  if (error.code !== '42703' && error.code !== 'PGRST204') return null;
  const message = `${error.message ?? ''} ${error.details ?? ''}`;
  const postgres = message.match(/column\s+(?:public\.)?(?:users\.)?["']?(\w+)["']?\s+does not exist/i);
  const postgrest = message.match(/could not find the ['"](\w+)['"] column of ['"]users['"]/i);
  const column = postgres?.[1] ?? postgrest?.[1];
  return column && column !== 'id' && columns.includes(column) ? column : null;
};

export async function loadAdminMemberProfiles(client: ProfileClient) {
  let columns: string[] = [...PROFILE_COLUMNS];
  const missingColumns: string[] = [];

  while (true) {
    const result = await client.from('users').select(columns.join(','));
    if (!result.error) {
      return { data: result.data ?? [], error: null, missingColumns };
    }

    const missing = getMissingOptionalColumn(result.error, columns);
    if (!missing) {
      // Permission, connection and unexpected query failures must not erase contacts silently.
      return { data: [], error: result.error, missingColumns };
    }

    missingColumns.push(missing);
    columns = columns.filter((column) => column !== missing);
  }
}
