import db from "../db";

export async function ensureUserHasHousehold(userId: string): Promise<number> {
  const user = await db.queryRow<{ household_id: number | null }>`
    SELECT household_id FROM users WHERE id = ${userId}
  `;

  if (user && user.household_id !== null) {
    return user.household_id;
  }

  const household = await db.queryRow<{ id: number }>`
    INSERT INTO households (name)
    VALUES ('My Household')
    RETURNING id
  `;

  if (!household) {
    throw new Error("Failed to create household");
  }

  if (user) {
    await db.exec`
      UPDATE users SET household_id = ${household.id} WHERE id = ${userId}
    `;
  } else {
    await db.exec`
      INSERT INTO users (id, household_id)
      VALUES (${userId}, ${household.id})
    `;
  }

  return household.id;
}
