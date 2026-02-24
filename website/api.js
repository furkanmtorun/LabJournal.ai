const API_BASE =
  "https://abpa6z6ap46nb5sxdi4trcp3hi0scfza.lambda-url.eu-central-1.on.aws";

const submitForm = (formSelector) => {
  const $form = $(formSelector);
  if (!$form.length) return Promise.reject("Form not found");

  return $.ajax({
    url: `${API_BASE}/experiments`,
    type: "POST",
    data: new FormData($form[0]),
    processData: false,
    contentType: false,
    dataType: "json",
  });
};

const fetchExperiments = () =>
  $.ajax({ url: `${API_BASE}/experiments`, type: "GET", dataType: "json" });

const fetchExperimentById = (experimentId) => {
  if (!experimentId) return Promise.reject("ID required");
  return $.ajax({
    url: `${API_BASE}/experiments/${encodeURIComponent(experimentId)}`,
    type: "GET",
    dataType: "json",
  });
};

const deleteExperimentById = (experimentId) => {
  if (!experimentId) return Promise.reject("ID required");
  return $.ajax({
    url: `${API_BASE}/experiments/${encodeURIComponent(experimentId)}`,
    type: "DELETE",
    dataType: "json",
  });
};

// Semantic search via AWS OpenSearch
const semanticSearch = (query, top_k = 5) =>
  $.ajax({
    url: `${API_BASE}/search/`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ query, top_k }),
  });