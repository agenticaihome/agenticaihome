export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  
  // Skip known static routes
  if (['/tasks/create', '/tasks/detail', '/tasks/analytics'].some(r => path.startsWith(r))) {
    return context.next();
  }
  
  const placeholderUrl = new URL('/tasks/placeholder', url.origin);
  const response = await context.env.ASSETS.fetch(placeholderUrl);
  
  return new Response(response.body, {
    status: 200,
    headers: response.headers,
  });
}
