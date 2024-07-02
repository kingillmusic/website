const
    searchBox = document.getElementById("SearchBox"),
    search = () => { let e = searchBox.value.toUpperCase();

    for (let s = 0; s < row.length; s++) if (
        row[s].style.display = "none",
        trt[s].innerHTML.toUpperCase().indexOf(e) > -1) {
            row[s].style.display=""; continue }};

searchBox.addEventListener("keyup",search);
