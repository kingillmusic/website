const
    sd = document.querySelector("#StartDuration"),
    ed = document.querySelector("#EndDuration");

let minute, second;

po.ontimeupdate = t => { let { duration: d, currentTime: c } = t.srcElement,
        ts = 0|d%60, tm = 0|d/60, // ts = totalSeconds & tm = totalMinutes
        cs = 0|c%60, cm = 0|c/60; // cs = currentSeconds & cm = currentMinutes
    td = ts < 10 ? `${tm}:0${ts}`:`${tm}:${ts}`, // td = totalDuration
    cd = cs < 10 ? `${cm}:0${cs}`:`${cm}:${cs}`, // cd = currentDuration
        sd.textContent = cd, ed.textContent = td };
