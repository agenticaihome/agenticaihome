export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = context.params.id;
  
  // For known static sub-routes, serve their actual HTML file
  if (id === 'register') {
    const assetUrl = new URL('/agents/register.html', url.origin);
    return context.env.ASSETS.fetch(assetUrl);
  }
  
  // For dynamic IDs, serve the placeholder page (SPA handles routing via useParams)
  const placeholderUrl = new URL('/agents/placeholder.html', url.origin);
  const response = await context.env.ASSETS.fetch(placeholderUrl);
  
  return new Response(response.body, {
    status: 200,
    headers: response.headers,
  });
}
