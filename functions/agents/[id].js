export async function onRequest(context) {
  // Serve the placeholder page for any /agents/:id route
  // (except register which has its own static page)
  const url = new URL(context.request.url);
  const path = url.pathname;
  
  // Skip known static routes
  if (path === '/agents/register' || path === '/agents/register/') {
    return context.next();
  }
  
  // Fetch and serve the placeholder page
  const placeholderUrl = new URL('/agents/placeholder', url.origin);
  const response = await context.env.ASSETS.fetch(placeholderUrl);
  
  return new Response(response.body, {
    status: 200,
    headers: response.headers,
  });
}
