const
    searchBox = document.getElementById("SearchBox"),
	scrollTop = document.getElementById("top"),
    search = () => { let e = searchBox.value.toUpperCase();

    for (let s = 0; s < row.length; s++) if (
        row[s].style.display = "none",
        trt[s].innerHTML.toUpperCase().indexOf(e) > -1) {
            row[s].style.display=""; continue }};

searchBox.addEventListener("keyup",search);

// scrollTop.addEventListener("click", () => { searchBox.focus(); });
scrollTop.addEventListener("click", () => { searchBox.scrollIntoView({ behavior:"smooth" }) });

