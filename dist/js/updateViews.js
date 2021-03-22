(function () {
  let button = document.querySelector("#refresh-button");
  let contentContainer = document.querySelector("#views-container");

// refresh on click
  button.addEventListener("click", function () {
    console.log( "refresh");
    let modes = [ "cors", "same-origin", "no-cors" ];
    let credentials = ["same-origin", "omit", "include"]

    runFetchUsing( undefined, "include",  contentContainer );
  })
})()

function runFetchUsing( mode, credential, contentContainer ) {
  let init = {};
  if( mode ) {
    init.mode = mode
  }

  if( credential ) {
    init.credentials = credential
  }

  fetch(
    "./views",
      init
  )
    .then( (response) => {
      console.log(
        "GOT RESPONSE:", response,
        "with headers:", Object.fromEntries( response.headers.entries() ),
        "using mode:", mode,
        "using credentials:", credential,
        "current cookie:", document.cookie
      );

      response.text()
        .then( (content) => {
          contentContainer.setAttribute("srcdoc", content );
        })
    })
}