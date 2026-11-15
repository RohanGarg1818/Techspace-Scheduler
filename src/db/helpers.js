export const buildUpdate = (table, id, updates, columns) => {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columns)) {
    if (updates[key] === undefined) {
      continue;
    }
    values.push(updates[key]);
    sets.push(`${column} = $${values.length}`);
  }
  sets.push("updated_at = now()");
  values.push(id);
  return {
    text: `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${values.length}`,
    values,
  };
};
