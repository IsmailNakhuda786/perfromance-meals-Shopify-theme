type SavedProgramme = {programmeGid: string; variantGid: string};
type Admin = {graphql: (query: string, options: {variables: {ids: string[]}}) => Promise<Response>};

export const ACCOUNT_PROGRAMME_QUERY = `#graphql
query AccountProgrammeNames($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant { id title product { id title } }
  }
}`;

export async function accountProgrammeNames(admin: Admin, plans: SavedProgramme[]) {
  const ids = [...new Set(plans.map(plan => plan.variantGid))];
  if (!ids.length) return new Map<string, {programmeTitle: string; variantTitle: string}>();
  if (ids.length > 50 || ids.some(id => !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(id))) throw new Error('Invalid saved programme references');
  const response = await admin.graphql(ACCOUNT_PROGRAMME_QUERY, {variables: {ids}});
  const body = await response.json();
  if (body.errors || !Array.isArray(body.data?.nodes)) throw new Error('Programme names unavailable');
  type Variant = {id: string; title: string; product: {id: string; title: string}};
  const variants = new Map<string, Variant>(body.data.nodes.filter(Boolean).map((variant: Variant) => [variant.id, variant]));
  return new Map(plans.flatMap(plan => {
    const variant = variants.get(plan.variantGid);
    return variant?.product.id === plan.programmeGid
      ? [[plan.variantGid, {programmeTitle: variant.product.title, variantTitle: variant.title}] as const]
      : [];
  }));
}

export async function accountMealNames(admin: Admin, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.some(id => !/^gid:\/\/shopify\/Product\/\d+$/.test(id))) throw new Error('Invalid meal references');
  const names = new Map<string, string>();
  for (let offset = 0; offset < unique.length; offset += 50) {
    const response = await admin.graphql(`query AccountMealNames($ids:[ID!]!){nodes(ids:$ids){... on Product{id title}}}`, {variables:{ids:unique.slice(offset,offset+50)}});
    const body = await response.json();
    if (body.errors || !Array.isArray(body.data?.nodes)) throw new Error('Meal names unavailable');
    for (const meal of body.data.nodes) if (meal?.id && meal.title) names.set(meal.id, meal.title);
  }
  return names;
}
