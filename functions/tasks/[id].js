export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = context.params.id;
  
  // Known static sub-routes
  const staticRoutes = ['create', 'detail', 'analytics'];
  if (staticRoutes.includes(id)) {
    const assetUrl = new URL(`/tasks/${id}`, url.origin);
    return context.env.ASSETS.fetch(assetUrl);
  }
  
  // Dynamic IDs — serve placeholder
  const placeholderUrl = new URL('/tasks/placeholder', url.origin);
  const response = await context.env.ASSETS.fetch(placeholderUrl);
  
  return new Response(response.body, {
    status: 200,
    headers: response.headers,
  });
}
