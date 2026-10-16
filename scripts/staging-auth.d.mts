export type TesterCredentials = {username: string; password: string; origin: string};
export function stagingCredentials(base: string, file?: string): TesterCredentials | undefined;
export function stagingAuthorization(base: string, file?: string): string | undefined;
