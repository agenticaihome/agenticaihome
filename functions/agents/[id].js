export async function onRequest(context) {
  const url = new URL(context.request.url);
  const placeholderUrl = new URL('/agents/placeholder.html', url.origin);
  return context.env.ASSETS.fetch(placeholderUrl);
}
