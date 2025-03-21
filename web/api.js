function apiRequest(baseUrl, endpoint, method, data = {}, successCallback, errorCallback) {
    $.ajax({
        url: `${baseUrl}/${endpoint}`,
        type: method.toUpperCase(),
        data: method.toUpperCase() === "GET" ? null : JSON.stringify(data),
        contentType: "application/json",
        success: successCallback,
        error: errorCallback
    });
}

// Example Usage:
const baseUrl = "https://api.sampleapis.com";

// GET request for "coffee/hot" page
apiRequest(baseUrl, "coffee/hot", "GET", {}, function(response) {
    console.log("GET Response:", response);
}, function(error) {
    console.error("GET Error:", error);
});

// POST request for "new.html" page
// apiRequest(baseUrl, "new.html", "POST", { name: "Sample" }, function(response) {
//     console.log("POST Response:", response);
// }, function(error) {
//     console.error("POST Error:", error);
// });

// DELETE request for "view" page
// apiRequest(baseUrl, "view", "DELETE", {}, function(response) {
//     console.log("DELETE Response:", response);
// }, function(error) {
//     console.error("DELETE Error:", error);
// });


