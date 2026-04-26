import { row, trt } from "./music.js";

const
    searchBox = document.getElementById("SearchBox"),
    scrollTop = document.getElementById("top"),
    search = () => {
        let query = searchBox.value.toUpperCase();

        for (let s = 0; s < row.length; s++) {
            // Build searchable text: visible cell content + BPM value
            let searchable = trt[s].innerHTML.toUpperCase();
            const bpm = row[s].dataset.bpm;   // may be undefined
            if (bpm !== undefined && bpm !== "") {
                // Append BPM with a space to avoid word concatenation
                searchable += " " + bpm;
            }

            // Show row if query matches anywhere in the combined string
            if (searchable.indexOf(query) > -1) {
                row[s].style.display = "";
            } else {
                row[s].style.display = "none";
            }
        }
    };

searchBox.addEventListener("keyup", search);

scrollTop.addEventListener("click", () => {
    searchBox.scrollIntoView({ behavior: "smooth" });
});