function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Handle root path
  if (uri === "/" || uri === "/home") {
    request.uri = "/index.html";
    return request;
  }

  // Handle /new route
  if (uri === "/new") {
    request.uri = "/new.html";
    return request;
  }

  // Handle /view/:id route
  // IMPORTANT NOTE: JS code in view.html will parse the 'id' here.
  // If we want to pass this to backend as a query parameter or header,
  // that's not possible with CloudFront Functions => I need Lambda@Edge.
  if (uri.startsWith("/view/")) {
    request.uri = "/view.html";
    return request;
  }

  // Handle /error route explicitly
  if (uri === "/error") {
    request.uri = "/error.html";
    return request;
  }

  // If no extension is provided and no specific route matches,
  // serve error.html for invalid paths
  if (!uri.includes(".")) {
    request.uri = "/error.html";
    return request;
  }

  // Keep the original request for all other cases (static assets)
  return request;
}
