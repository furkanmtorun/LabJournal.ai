const API_BASE =
  "https://abpa6z6ap46nb5sxdi4trcp3hi0scfza.lambda-url.eu-central-1.on.aws/";

function submitForm(formSelector) {
  const $form = $(formSelector);
  if (!$form.length) return Promise.reject("Form not found");

  return $.ajax({
    url: API_BASE + "experiments",
    type: "POST",
    data: new FormData($form[0]),
    processData: false,
    contentType: false, // fastapi will handle the rest
    dataType: "json",
  });
}

function fetchExperiments() {
  return $.ajax({
    url: API_BASE + "experiments",
    type: "GET",
    dataType: "json",
  });
}

function fetchExperimentById(experimentId) {
  if (!experimentId) return Promise.reject("ID required");
  return $.ajax({
    url: API_BASE + "experiments/" + encodeURIComponent(experimentId),
    type: "GET",
    dataType: "json",
  });
}

function deleteExperimentById(experimentId) {
  if (!experimentId) return Promise.reject("ID required");
  return $.ajax({
    url: API_BASE + "experiments/" + encodeURIComponent(experimentId),
    type: "DELETE",
    dataType: "json",
  });
}
