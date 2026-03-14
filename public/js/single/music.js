const
    so = document.querySelector("#SingleAudio"),
//    ba = document.querySelector("#Five"),
    pp = document.querySelector("#PlayerPlay"),
//    fo = document.querySelector("#Fifteen");
    st = document.querySelector("#SingleTitle");

const pause = () => { so.pause(), pp.src = "/svg/play.svg", st.style.color = "#000" }; 

play = () => { so.play(), pp.src = "/svg/pause.svg", st.style.color = "#87ffff" };

//ba.addEventListener("click", () => { so.currentTime -= 5 }),
st.addEventListener("click", () => { so.paused ? play() : pause() }),
pp.addEventListener("click", () => { so.paused ? play() : pause() }),
//fo.addEventListener("click", () => { so.currentTime += 15 }),
so.addEventListener("ended", () => { so.currentTime = 0 });
